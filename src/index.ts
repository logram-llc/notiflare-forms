import type { IEnv } from "./types";
import { RequestHandler } from "./handler";
import { NotionClient } from "./notion/notion";
import { R2FileStore } from "./file_store";

export { IEnv as Env };

export default {
  async fetch(request: Request, env: IEnv): Promise<Response> {
    const notionClient = new NotionClient(env.NOTION_INTEGRATION_TOKEN);
    const fileStore =
      Boolean(env.R2) && Boolean(env.R2_BUCKET_URL)
        ? new R2FileStore(env.R2_BUCKET_URL as string, env.R2 as R2Bucket)
        : null;

    return new RequestHandler(env, notionClient, fileStore).handle(request);
  },
};
