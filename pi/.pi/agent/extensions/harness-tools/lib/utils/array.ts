export const isEmptyArray = <T>(arg: T[] | null | undefined): arg is [] =>
  arg === null || arg === undefined || arg.length === 0;

export const isSoleArray = <T>(arg: T[] | null | undefined): arg is [T] =>
  arg !== null && arg !== undefined && arg.length === 1;
