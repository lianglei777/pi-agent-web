import { describe, expect, test } from "vitest";
import { isDialogDirty, resolveDialogClose } from "./dialog-safety";

describe("resolveDialogClose", () => {
  test("ignores backdrop and escape close attempts", () => {
    expect(resolveDialogClose({ source: "backdrop", dirty: false })).toBe(
      "stay",
    );
    expect(resolveDialogClose({ source: "escape", dirty: false })).toBe(
      "stay",
    );
  });

  test("closes clean dialogs only through explicit actions", () => {
    expect(resolveDialogClose({ source: "explicit", dirty: false })).toBe(
      "close",
    );
  });

  test("requires discard confirmation for dirty dialogs", () => {
    expect(resolveDialogClose({ source: "explicit", dirty: true })).toBe(
      "confirm-discard",
    );
  });
});

describe("isDialogDirty", () => {
  test("ignores object key order", () => {
    expect(isDialogDirty({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(false);
  });

  test("detects persisted value changes", () => {
    expect(isDialogDirty({ a: 1 }, { a: 2 })).toBe(true);
  });
});
