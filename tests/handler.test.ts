import { describe, expect, it } from "@jest/globals";
import each from "jest-each";
import { SCHEMA_01 } from "./fixtures/notion_database_schemas";
import {
  CreateFileStore,
  CreateNotionClient,
  CreateRequestHandler,
} from "./utils";
import { readFileSync } from "fs";
import { join } from "path";

describe("RequestHandler", () => {
  each`
    method
    ${"HEAD"}
    ${"GET"}
    ${"PATCH"}
    ${"PUT"}
    ${"DELETE"}
    `.it("should reject $method HTTP request", async ({ method }) => {
    const request = new Request("https://logram.io", {
      method,
    });
    const requestHandler = CreateRequestHandler({
      notionClient: CreateNotionClient(SCHEMA_01),
      requiredFields: "Name,Email,Message",
    });

    const response = await requestHandler.handle(request);

    expect(response.status).toBe(405);

    const responseAllowHeader = response.headers.get("Allow");
    expect(responseAllowHeader).not.toBeNull();
    expect((responseAllowHeader as string).split(", ").sort()).toStrictEqual(
      ["POST", "OPTIONS"].sort()
    );
  });

  it("should handle preflight OPTIONS HTTP request", async () => {
    const request = new Request("https://logram.io", {
      method: "OPTIONS",
      headers: {
        Origin: "https://logram.io",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type",
      },
    });
    const requestHandler = CreateRequestHandler({
      notionClient: CreateNotionClient(SCHEMA_01),
      requiredFields: "Name,Email,Message",
    });

    const response = await requestHandler.handle(request);

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      requestHandler.env.CORS_ALLOW_ORIGIN
    );
    expect(response.headers.get("Access-Control-Max-Age")).toBe(
      requestHandler.env.CORS_MAX_AGE
    );

    const responseAllowMethodsHeader = response.headers.get(
      "Access-Control-Allow-Methods"
    );
    expect(responseAllowMethodsHeader).not.toBeNull();
    expect(
      (responseAllowMethodsHeader as string).split(", ").sort()
    ).toStrictEqual(["POST", "OPTIONS"].sort());
  });

  it("should handle standard OPTIONS HTTP request", async () => {
    const request = new Request("https://logram.io", {
      method: "OPTIONS",
    });
    const requestHandler = CreateRequestHandler({
      notionClient: CreateNotionClient(SCHEMA_01),
      requiredFields: "Name,Email,Message",
    });
    const response = await requestHandler.handle(request);

    expect(response.status).toBe(204);

    const responseAllowHeader = response.headers.get("Allow");
    expect(responseAllowHeader).not.toBeNull();
    expect((responseAllowHeader as string).split(", ").sort()).toStrictEqual(
      ["POST", "OPTIONS"].sort()
    );
  });

  it("should 204 POST HTTP requests with good form data", async () => {
    const formData = new FormData();
    formData.append("Name", "Tester");
    formData.append("Email", "hi@example.com");
    formData.append("Message", "Nice to meet you!");

    const request = new Request("https://logram.io", {
      method: "POST",
      body: formData,
    });
    const requestHandler = CreateRequestHandler({
      notionClient: CreateNotionClient(SCHEMA_01),
      requiredFields: "Name,Email,Message",
    });
    const response = await requestHandler.handle(request);

    expect(response.status).toBe(204);
  });

  each([
    {
      formData: {
        Name: "Tester",
        Email: "test@example.com",
      },
      requiredFields: "Message",
      expectedStatusCode: 400,
    },
    { formData: {}, expectedStatusCode: 400, requiredFields: "Email" },
    {
      formData: {
        Email: "test@example.com",
        Message: "Hi!",
      },
      requiredFields: "Email,Message",
      expectedStatusCode: 204,
    },
    {
      formData: {
        Message: "Hi!",
      },
      requiredFields: "Email,Message",
      expectedStatusCode: 400,
    },
    {
      formData: {
        Email: "test@example.com",
      },
      requiredFields: "Email,Message",
      expectedStatusCode: 400,
    },
  ]).it(
    "should $expectedStatusCode HTTP POST if missing $requiredFields fields from $formData",
    async ({
      expectedStatusCode,
      requiredFields,
      formData,
    }: {
      formData: Record<string, unknown>;
      requiredFields: string;
      expectedStatusCode: number;
    }) => {
      const formDataPayload = new FormData();
      for (const [key, val] of Object.entries(formData)) {
        formDataPayload.append(key, val as string);
      }

      const request = new Request("https://logram.io", {
        method: "POST",
        body: formDataPayload,
      });

      const requestHandler = CreateRequestHandler({
        notionClient: CreateNotionClient(SCHEMA_01),
        requiredFields,
      });
      const response = await requestHandler.handle(request);

      const expectingSuccess =
        expectedStatusCode >= 200 && expectedStatusCode <= 299;
      if (expectingSuccess) {
        expect(response.status).toBe(204);
      } else {
        const responseBody: Record<string, unknown> = await response.json();

        const responseBodyErrors = responseBody.errors as string[];
        expect(response.status).toBe(400);
        expect(responseBodyErrors.length).toBeGreaterThan(0);

        let containsRequiredFieldError = true;
        for (const requiredField of requiredFields.split(",")) {
          for (const error of responseBodyErrors) {
            if (!error.includes(requiredField)) {
              containsRequiredFieldError = false;
            }
          }
        }
        expect(containsRequiredFieldError).toBe(true);
      }
    }
  );

  it("should upload files to file store if a file store is passed", async () => {
    const attachment1 = readFileSync(
      join(__dirname, "./fixtures/files/1.webp")
    );
    const attachment2 = readFileSync(
      join(__dirname, "./fixtures/files/2.webp")
    );

    const formData = new FormData();
    formData.append("Name", "Test Name");
    formData.append(
      "Attachments",
      new File([attachment1], "attachment1.webp", { type: "image/webp" }),
    );
    formData.append(
      "Attachments",
      new File([attachment2], "attachment2.webp", { type: "image/webp" }),
    );

    const request = new Request("https://logram.io", {
      method: "POST",
      body: formData,
    });

    const notionClient = CreateNotionClient(SCHEMA_01);
    const databaseSchema = await notionClient.getDatabaseSchema(
      SCHEMA_01["id"]
    );

    const fileStoreBaseUrl = "https://example.com/";
    const requestHandler = CreateRequestHandler({
      notionClient,
      requiredFields: "Name",
      fileStore: CreateFileStore(fileStoreBaseUrl),
    });
    const parsedFormData = await requestHandler.formData(
      request,
      databaseSchema
    );

    expect(Object.hasOwn(parsedFormData, "Attachments")).toBe(true);

    expect(parsedFormData["Attachments"].length).toBeGreaterThan(0);
    for (const parsedAttachmentValue of parsedFormData["Attachments"]) {
      expect(parsedAttachmentValue.startsWith(fileStoreBaseUrl)).toBe(true);
    }
  });

  it("should not upload files if a file store is not passed", async () => {
    const attachment1 = readFileSync(
      join(__dirname, "./fixtures/files/1.webp")
    );
    const attachment2 = readFileSync(
      join(__dirname, "./fixtures/files/2.webp")
    );

    const formData = new FormData();
    formData.append("Name", "Test Name");
    formData.append("Attachments", new File([attachment1], "attachment1.webp", { type: "image/webp" }),);
    formData.append("Attachments", new File([attachment2], "attachment2.webp", { type: "image/webp" }),);

    const request = new Request("https://logram.io", {
      method: "POST",
      body: formData,
    });

    const notionClient = CreateNotionClient(SCHEMA_01);
    const databaseSchema = await notionClient.getDatabaseSchema(
      SCHEMA_01["id"]
    );

    const requestHandler = CreateRequestHandler({
      notionClient,
      requiredFields: "Name",
    });
    const parsedFormData = await requestHandler.formData(
      request,
      databaseSchema
    );

    expect(Object.hasOwn(parsedFormData, "Attachments")).toBe(true);
    expect(parsedFormData.Attachments.length).toBe(0);
  });
});
