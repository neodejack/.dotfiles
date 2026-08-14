export const isNil = <T>(
  arg: T | null | undefined,
): arg is null | undefined => arg === null || arg === undefined;

export const isNotNil = <T>(arg: T | null | undefined): arg is T =>
  arg !== null && arg !== undefined;
