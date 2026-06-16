import { en } from "./dictionaries/en";

type WidenStrings<T> = {
  readonly [Key in keyof T]: T[Key] extends string
    ? string
    : WidenStrings<T[Key]>;
};

export type Dictionary = WidenStrings<typeof en>;
