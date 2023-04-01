import { describe, expect, it } from "@jest/globals";
import each from "jest-each";
import {
  DatabaseColumnConverter,
  ColumnConverters,
} from "../src/notion/converters";
import { DatabaseColumnType } from "../src/types";

describe("Notion converters", () => {
  each([
    {
      converter: ColumnConverters[DatabaseColumnType.Email],
      data: ["hi@aol.com"],
      expectedResult: {
        email: "hi@aol.com",
      },
    },
    {
      converter: ColumnConverters[DatabaseColumnType.Url],
      data: ["https://example.com"],
      expectedResult: {
        url: "https://example.com",
      },
    },
    {
      converter: ColumnConverters[DatabaseColumnType.PhoneNumber],
      data: ["+1479370008"],
      expectedResult: {
        phone_number: "+1479370008",
      },
    },
    {
      converter: ColumnConverters[DatabaseColumnType.RichText],
      data: ["Hello, World", "This is a multiline message!"],
      expectedResult: {
        rich_text: [
          {
            text: {
              content: "Hello, World",
            },
          },
          {
            text: {
              content: "This is a multiline message!",
            },
          },
        ],
      },
    },
    {
      converter: ColumnConverters[DatabaseColumnType.Date],
      data: ["2022-01-01"],
      expectedResult: {
        date: {
          start: "2022-01-01",
          end: null,
          time_zone: null,
        },
      },
    },
    {
      converter: ColumnConverters[DatabaseColumnType.Date],
      data: ["2022-01-01T00:00:12Z"],
      expectedResult: {
        date: {
          start: "2022-01-01T00:00:12Z",
          end: null,
          time_zone: null,
        },
      },
    },
    {
      converter: ColumnConverters[DatabaseColumnType.Files],
      data: [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/MD5_algorithm.svg/1280px-MD5_algorithm.svg.png",
        "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/CIAJMK1209-en.svg/1280px-CIAJMK1209-en.svg.png",
      ],
      expectedResult: {
        files: [
          {
            external: {
              url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/MD5_algorithm.svg/1280px-MD5_algorithm.svg.png",
            },
            name: "1280px-MD5_algorithm.svg.png",
          },
          {
            external: {
              url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/CIAJMK1209-en.svg/1280px-CIAJMK1209-en.svg.png",
            },
            name: "1280px-CIAJMK1209-en.svg.png",
          },
        ],
      },
    },
    {
      converter: ColumnConverters[DatabaseColumnType.Select],
      data: ["Meeting Notes"],
      expectedResult: {
        select: {
          name: "Meeting Notes",
        },
      },
    },
    {
      converter: ColumnConverters[DatabaseColumnType.MultiSelect],
      data: ["Meeting Notes", "Discussion Notes"],
      expectedResult: {
        multi_select: [
          {
            name: "Meeting Notes",
          },
          {
            name: "Discussion Notes",
          },
        ],
      },
    },
    {
      converter: ColumnConverters[DatabaseColumnType.Status],
      data: ["In Progress"],
      expectedResult: {
        status: {
          name: "In Progress",
        },
      },
    },
    {
      converter: ColumnConverters[DatabaseColumnType.People],
      data: ["person-01", "person-02", "person-03"],
      expectedResult: {
        people: [
          {
            id: "person-01",
          },
          {
            id: "person-02",
          },
          {
            id: "person-03",
          },
        ],
      },
    },
    {
      converter: ColumnConverters[DatabaseColumnType.Number],
      data: ["10"],
      expectedResult: {
        number: 10,
      },
    },
    {
      converter: ColumnConverters[DatabaseColumnType.Number],
      data: ["10.2"],
      expectedResult: {
        number: 10.2,
      },
    },
    {
      converter: ColumnConverters[DatabaseColumnType.Checkbox],
      data: ["1"],
      expectedResult: {
        checkbox: true,
      },
    },
    {
      converter: ColumnConverters[DatabaseColumnType.Checkbox],
      data: ["0"],
      expectedResult: {
        checkbox: false,
      },
    },
    {
      converter: ColumnConverters[DatabaseColumnType.Checkbox],
      data: ["true"],
      expectedResult: {
        checkbox: true,
      },
    },
    {
      converter: ColumnConverters[DatabaseColumnType.Checkbox],
      data: ["false"],
      expectedResult: {
        checkbox: false,
      },
    },
  ]).it(
    "should deserialize $data ($converter) to $expectedResult",
    ({
      converter,
      data,
      expectedResult,
    }: {
      converter: DatabaseColumnConverter;
      data: string[];
      expectedResult: Record<string, unknown>;
    }) => {
      expect(converter(data)).toStrictEqual(expectedResult);
    }
  );
});

describe("NotionClient.buildChildren", () => {
  it("", () => {});
});
