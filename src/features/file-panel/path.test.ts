import { describe, expect, it } from "vitest";
import { joinPath, relativePath } from "./path";

describe("file paths", () => {
  it("joins POSIX paths and resolves Windows-relative paths", () => {
    expect(joinPath("/work/app", "src")).toBe("/work/app/src");
    expect(relativePath("C:\\work\\app", "C:\\work\\app\\src\\x.ts")).toBe(
      "src/x.ts",
    );
  });
});
