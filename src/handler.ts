import { UnexpectedValueError } from "./notion/notion";
import {
  DatabasePage,
  IEnv,
  DatabaseSchema,
  DatabaseValues,
  DatabaseColumnType,
} from "./types";

interface INotionClient {
  createDatabasePage(page: DatabasePage): Promise<void>;
  getDatabaseSchema(databaseID: string): Promise<DatabaseSchema>;
  buildDatabaseEntry(
    databaseID: string,
    schema: DatabaseSchema,
    values: DatabaseValues
  ): Promise<DatabasePage>;
}

interface IFileStore {
  put(key: string, file: File): Promise<string>;
}

class FormDataError extends Error {
  readonly response: Response;

  constructor(errorResponse: Response) {
    super(
      `Failed to process request's form data: HTTP ${errorResponse.status}`
    );

    this.response = errorResponse;
  }
}

class RequestHandler {
  env: IEnv;
  notionClient: INotionClient;
  fileStore: IFileStore | null;

  constructor(
    env: IEnv,
    notionClient: INotionClient,
    fileStore: IFileStore | null = null
  ) {
    this.env = env;
    this.notionClient = notionClient;
    this.fileStore = fileStore;
  }

  get isUploadEnabled(): boolean {
    return Boolean(this.fileStore);
  }

  get defaultHeaders(): Record<string, string> {
    return {
      "Access-Control-Allow-Origin": this.env.CORS_ALLOW_ORIGIN ?? "*",
      "Access-Control-Allow-Methods": "OPTIONS, POST",
      "Access-Control-Max-Age": this.env.CORS_MAX_AGE ?? "86400",
    };
  }

  jsonResponse(
    statusCode: number,
    errors: string[],
    additionalHeaders: Record<string, string> = {}
  ): Response {
    return new Response(
      JSON.stringify({
        errors,
      }),
      {
        status: statusCode,
        headers: {
          ...this.defaultHeaders,
          "Content-type": "application/json",
          ...additionalHeaders,
        },
      }
    );
  }

  async options(request: Request): Promise<Response> {
    const headers = request.headers;

    const isPreflight =
      headers.get("Origin") !== null &&
      headers.get("Access-Control-Request-Method") !== null &&
      headers.get("Access-Control-Request-Headers") !== null;

    if (isPreflight) {
      return new Response(null, {
        status: 204,
        headers: {
          ...this.defaultHeaders,
          "Access-Control-Allow-Headers": "*",
        },
      });
    }

    // Handle standard OPTIONS request.
    return new Response(null, {
      status: 204,
      headers: {
        Allow: "OPTIONS, POST",
      },
    });
  }

  async formData(
    request: Request,
    databaseSchema: DatabaseSchema
  ): Promise<DatabaseValues> {
    let formData: FormData | null = null;

    try {
      formData = await request.formData();
    } catch {
      throw new FormDataError(
        this.jsonResponse(415, [
          "Failed to parse request body as form data. Send multipart/form-data.",
        ])
      );
    }

    const requiredFields = this.env.NOTION_REQUIRED_COLUMNS.split(",");
    const hasRequiredFields = requiredFields.every((field) =>
      formData!.get(field)
    );

    if (!hasRequiredFields) {
      throw new FormDataError(
        this.jsonResponse(400, [
          `The following fields must contain a value: ${requiredFields.join(
            ", "
          )}`,
        ])
      );
    }

    const unexpectedFields: string[] = Array.from(formData.keys()).filter(
      (k) => !Object.hasOwn(databaseSchema, k)
    );

    if (unexpectedFields.length > 0) {
      throw new FormDataError(
        this.jsonResponse(400, [
          `The following fields were unexpected: ${unexpectedFields.join(
            ", "
          )}`,
        ])
      );
    }

    const uploadFile = async (f: File): Promise<string> => {
      const key = crypto.randomUUID();

      return (this.fileStore as IFileStore).put(key, f);
    };

    const columnValues: DatabaseValues = {};

    try {
      for (const key of new Set(formData.keys())) {
        // Do not add field if not in schema
        if (!Object.hasOwn(databaseSchema, key)) {
          continue;
        }

        const canUpload =
          this.isUploadEnabled &&
          databaseSchema[key].type === DatabaseColumnType.Files;

        const value = formData!
          .getAll(key)
          .filter((v) => canUpload || (!canUpload && !(v instanceof File))) // Strip Files if they cannot upload
          .filter((v) => Boolean(v)) // Strip empty strings

        if (canUpload) {
          for (const [index, element] of value.entries()) {
            if (typeof element === "string") {
              continue;
            }
            if (!(element instanceof File)) {
              throw new FormDataError(
                this.jsonResponse(400, [
                  `${key} must be either a file or a string`,
                ])
              );
            }

            value[index] = await uploadFile(element);
          }
        }

        columnValues[key] = value as string[];
      }
    } catch (e) {
      throw new FormDataError(
        this.jsonResponse(500, ["Failed to upload files", String(e)])
      );
    }

    return columnValues;
  }

  async post(request: Request): Promise<Response> {
    let databaseSchema: DatabaseSchema | null = null;

    try {
      databaseSchema = await this.notionClient.getDatabaseSchema(
        this.env.NOTION_DATABASE_ID
      );
    } catch (e: unknown) {
      return this.jsonResponse(500, ["Unable to fetch Notion database schema"]);
    }

    let formValues: DatabaseValues | null = null;
    try {
      formValues = await this.formData(request, databaseSchema);
    } catch (e: unknown) {
      if (e instanceof FormDataError) {
        return e.response;
      }
      return this.jsonResponse(500, ["Unable to process form data."]);
    }

    try {
      const databaseEntry = await this.notionClient.buildDatabaseEntry(
        this.env.NOTION_DATABASE_ID,
        databaseSchema,
        formValues
      );

      this.notionClient.createDatabasePage(databaseEntry);

      return new Response(null, {
        status: 204,
        headers: {
          ...this.defaultHeaders,
        },
      });
    } catch (e: unknown) {
      if (e instanceof UnexpectedValueError) {
        const errors = [e.toString()];
        if (e?.cause) {
          errors.push(e.cause.toString());
        }
        return this.jsonResponse(400, errors);
      }
      if (e instanceof Object && Object.hasOwn(e, "code")) {
        // @ts-ignore
        return this.jsonResponse(500, [e.code]);
      }

      return this.jsonResponse(500, ["Unknown server error"]);
    }
  }

  async handle(request: Request): Promise<Response> {
    const requestMethod = request.method.toUpperCase();

    if (requestMethod === "OPTIONS") {
      return this.options(request);
    }
    if (requestMethod === "POST") {
      return this.post(request);
    }

    return this.jsonResponse(405, ["Forbidden request method."], {
      Allow: "OPTIONS, POST",
    });
  }
}

export { RequestHandler };
export type { IFileStore, INotionClient };
