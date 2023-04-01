import { NotionClient } from "../src/notion/notion";
import { GetDatabaseResponse } from "@notionhq/client/build/src/api-endpoints";
import { IFileStore, INotionClient, RequestHandler } from "../src/handler";

function CreateNotionClient(schema: GetDatabaseResponse): NotionClient {
  class MockNotionClient extends NotionClient {
    async retrieveDatabase(): Promise<GetDatabaseResponse> {
      return schema;
    }
    async createDatabasePage(): Promise<void> {}
  }

  return new MockNotionClient("TEST_AUTH_ID");
}

function CreateFileStore(baseUrl: string): IFileStore {
  const normalizedBaseUrl = baseUrl.endsWith("/")
    ? baseUrl.slice(0, -1)
    : baseUrl;

  class MockFileStore {
    async put(key: string, _: File): Promise<string> {
      return `${normalizedBaseUrl}/${key}`;
    }
  }

  return new MockFileStore();
}

function CreateRequestHandler({
  requiredFields,
  notionClient,
  fileStore,
}: {
  requiredFields: string;
  notionClient: INotionClient;
  fileStore?: IFileStore;
}): RequestHandler {
  return new RequestHandler(
    {
      NOTION_DATABASE_ID: "",
      NOTION_INTEGRATION_TOKEN: "",
      NOTION_REQUIRED_COLUMNS: requiredFields,
      CORS_ALLOW_ORIGIN: "*",
      CORS_MAX_AGE: "86400",
    },
    notionClient,
    fileStore ? fileStore : null
  );
}

export { CreateRequestHandler, CreateNotionClient, CreateFileStore };
