import {
  DatabaseValues,
  DatabaseValue,
  DatabasePage,
  DatabaseSchema,
  ToDatabaseColumnType,
  DatabaseColumnType,
} from "../types";
import { Client as NotionAPIClient } from "@notionhq/client";
import { ColumnConverters } from "./converters";
import { GetDatabaseResponse } from "@notionhq/client/build/src/api-endpoints";

class UnexpectedValueError extends Error {
  columnName: string;
  columnValue: DatabaseValue;
  columnType: DatabaseColumnType | string;

  constructor(
    columnName: string,
    columnValue: DatabaseValue,
    columnType: DatabaseColumnType | string,
    options: ErrorOptions
  ) {
    super(
      `Unexpected value '${columnValue}' for '${columnName}' (${columnType.toString()})`,
      options
    );

    this.columnName = columnName;
    this.columnValue = columnValue;
    this.columnType = columnType;
  }
}

class NotionClient {
  apiClient: NotionAPIClient;

  constructor(authToken: string) {
    this.apiClient = new NotionAPIClient({
      auth: authToken,
    });
  }

  async retrieveDatabase(databaseID: string): Promise<GetDatabaseResponse> {
    return this.apiClient.databases.retrieve({
      database_id: databaseID,
    }); 
  }

  async createDatabasePage(page: DatabasePage): Promise<void> {
    await this.apiClient.pages.create(page);
  }

  async getDatabaseSchema(databaseID: string): Promise<DatabaseSchema> {
    const res = await this.retrieveDatabase(databaseID)

    return Object.values(res.properties).reduce((acc, { name, type }) => {
      acc[name] = {
        type,
        name,
      };

      return acc;
    }, {} as DatabaseSchema);
  }

  buildChildren(values: DatabaseValues): DatabasePage["children"] {
    const children: DatabasePage["children"] = [
      {
        object: "block",
        type: "heading_1",
        heading_1: {
          rich_text: [
            {
              type: "text",
              text: {
                content: "Form",
              },
            },
          ],
        },
      },
    ];

    for (const [name, value] of Object.entries(values)) {
      children.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: {
                content: name,
              },
              annotations: {
                bold: true,
              },
            },
          ],
        },
      });

      let textualValue = value.join(", ");
      children.push({
        object: "block",
        type: "quote",
        quote: {
          rich_text: [
            {
              type: "text",
              text: {
                content: textualValue as string,
              },
            },
          ],
        },
      });
    }

    return children;
  }

  async buildDatabaseEntry(
    databaseID: string,
    schema: DatabaseSchema,
    values: DatabaseValues
  ): Promise<DatabasePage> {
    const props: DatabasePage["properties"] = {};

    for (const { name: columnName, type: columnType } of Object.values(
      schema
    )) {
      // If the column name is not in values, ignore it
      if (!Object.hasOwn(values, columnName)) {
        continue;
      }

      const columnValue = values[columnName];

      try {
        const convert = ColumnConverters[ToDatabaseColumnType(columnType)];
        // TODO
        // @ts-ignore
        props[columnName] = convert(columnValue);
      } catch (e: unknown) {
        throw new UnexpectedValueError(columnName, columnValue, columnType, {
          cause: e,
        });
      }
    }

    props.title = {
      title: [
        {
          text: {
            content: `Form Submission`,
          },
        },
      ],
    };

    // TODO
    // @ts-ignore
    return {
      parent: {
        database_id: databaseID,
      },
      properties: props,
      children: this.buildChildren(values),
    };
  }
}

export { NotionClient, UnexpectedValueError };
