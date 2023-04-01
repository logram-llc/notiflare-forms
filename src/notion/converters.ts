import { DatabaseColumnType } from "../types";
import { basename } from "path";

class TooManyValuesError extends Error {
  constructor() {
    super("Too many values given");
  }
}

type DatabaseColumnConverter = (value: string[]) => Record<string, unknown>;

const ColumnConverters: Record<DatabaseColumnType, DatabaseColumnConverter> = {
  [DatabaseColumnType.Email]: (value: string[]): Record<string, unknown> => {
    if (value.length > 1) {
      throw new TooManyValuesError();
    }

    return {
      [DatabaseColumnType.Email]: value[0],
    };
  },
  [DatabaseColumnType.Url]: (value: string[]): Record<string, unknown> => {
    if (value.length > 1) {
      throw new TooManyValuesError();
    }

    return {
      [DatabaseColumnType.Url]: value[0],
    };
  },
  [DatabaseColumnType.PhoneNumber]: (
    value: string[]
  ): Record<string, unknown> => {
    if (value.length > 1) {
      throw new TooManyValuesError();
    }

    return {
      [DatabaseColumnType.PhoneNumber]: value[0],
    };
  },
  [DatabaseColumnType.RichText]: (value: string[]): Record<string, unknown> => {
    return {
      [DatabaseColumnType.RichText]: value.map((v) => ({
        text: { content: v },
      })),
    };
  },
  [DatabaseColumnType.Date]: (value: string[]): Record<string, unknown> => {
    if (value.length > 1) {
      throw new TooManyValuesError();
    }

    return {
      [DatabaseColumnType.Date]: {
        start: value[0],
        end: null, // TODO
        time_zone: null, // TODO
      },
    };
  },
  [DatabaseColumnType.Files]: (value: string[]): Record<string, unknown> => {
    const toFileColumn = (file: string) => {
      const fileName = basename(new URL(file).pathname);

      if (!fileName) {
        throw new Error(`Cannot get basename of URL '${file}'`);
      }

      return {
        external: { url: file },
        name: fileName,
      };
    };

    return {
      [DatabaseColumnType.Files]: value.map(toFileColumn),
    };
  },
  [DatabaseColumnType.Select]: (value: string[]): Record<string, unknown> => {
    if (value.length > 1) {
      throw new TooManyValuesError();
    }

    return {
      [DatabaseColumnType.Select]: {
        name: value[0],
      },
    };
  },
  [DatabaseColumnType.MultiSelect]: (
    value: string[]
  ): Record<string, unknown> => {
    return {
      [DatabaseColumnType.MultiSelect]: value.map((val) => ({
        name: val,
      })),
    };
  },
  [DatabaseColumnType.Status]: (value: string[]): Record<string, unknown> => {
    if (value.length > 1) {
      throw new TooManyValuesError();
    }

    return {
      [DatabaseColumnType.Status]: {
        name: value[0],
      },
    };
  },
  [DatabaseColumnType.People]: (value: string[]): Record<string, unknown> => {
    return {
      // NOTE: https://developers.notion.com/reference/get-users
      // This API does not currently support filtering user by their
      // email and/or name.
      [DatabaseColumnType.People]: value.map((val) => ({ id: val })),
    };
  },
  [DatabaseColumnType.Number]: (value: string[]): Record<string, unknown> => {
    if (value.length > 1) {
      throw new TooManyValuesError();
    }

    const parsedNumber = parseFloat(value[0]);
    if (Number.isNaN(parsedNumber)) {
      throw new Error();
    }

    return {
      [DatabaseColumnType.Number]: parsedNumber,
    };
  },
  [DatabaseColumnType.Checkbox]: (value: string[]): Record<string, unknown> => {
    if (value.length > 1) {
      throw new TooManyValuesError();
    }

    return {
      [DatabaseColumnType.Checkbox]: value[0] === "1" || value[0] === "true",
    };
  },
};

export { ColumnConverters, TooManyValuesError };
export type { DatabaseColumnConverter };
