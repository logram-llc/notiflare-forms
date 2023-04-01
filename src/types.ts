import { CreatePageParameters } from "@notionhq/client/build/src/api-endpoints";

interface IEnv {
  NOTION_DATABASE_ID: string;
  NOTION_INTEGRATION_TOKEN: string;
  NOTION_REQUIRED_COLUMNS: string;

  R2?: R2Bucket;
  R2_BUCKET_URL?: string;

  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Origin
  CORS_ALLOW_ORIGIN?: string;
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Max-Age
  CORS_MAX_AGE?: string;
}

type DatabaseValue = string[];
type DatabaseValues = Record<string, DatabaseValue>;
type DatabasePage = CreatePageParameters;
type DatabaseSchema = Record<
  string,
  {
    name: string;
    type: string;
  }
>;

enum DatabaseColumnType {
  RichText = "rich_text",
  PhoneNumber = "phone_number",
  Url = "url",
  Email = "email",
  Date = "date",
  Files = "files",
  Select = "select",
  MultiSelect = "multi_select",
  Status = "status",
  People = "people",
  Number = "number",
  Checkbox = "checkbox",
}

function ToDatabaseColumnType(type: string): DatabaseColumnType {
  const value = Object.entries(DatabaseColumnType).filter(
    ([k, v]) => k === type || v === type
  );

  if (value.length === 0) {
    throw Error(`${type} does not correspond to a DatabaseColumnType`);
  }

  // @ts-ignore
  return DatabaseColumnType[value[0][0]];
}

export type {
  IEnv,
  DatabasePage,
  DatabaseSchema,
  DatabaseValues,
  DatabaseValue,
};
export { DatabaseColumnType, ToDatabaseColumnType };
