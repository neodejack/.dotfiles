import { isNil } from "./nil";

const isString = (value: unknown): value is string =>
  typeof value === "string";

export const isBlank = (
  value: string | undefined | null | number,
): value is "" | null | undefined =>
  isString(value) ? value.trim() === "" : isNil(value);
