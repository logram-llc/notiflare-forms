import { GetDatabaseResponse } from "@notionhq/client/build/src/api-endpoints";

const SCHEMA_01: GetDatabaseResponse = {
  object: "database",
  id: "gcreh2d2-413d-482f-c097-j26ee74526e3",
  properties: {
    Name: {
      id: "%3Fi%3B%5B",
      name: "Name",
      type: "rich_text",
      rich_text: {},
    },
    Message: {
      id: "NiTl",
      name: "Message",
      type: "rich_text",
      rich_text: {},
    },
    Attachments: {
      id: "S%3F%3Ff",
      name: "Attachments",
      type: "files",
      files: {},
    },
    Email: { id: "%7BfIc", name: "Email", type: "email", email: {} },
    Title: { id: "title", name: "Title", type: "title", title: {} },
  },
};

export { SCHEMA_01 };
