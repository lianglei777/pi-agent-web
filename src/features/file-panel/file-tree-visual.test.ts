import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  fileURLToPath(new URL("./file-tree.tsx", import.meta.url)),
  "utf8",
);

describe("file tree", () => {
  it("keeps existing file operations without adding search", () => {
    expect(source).toContain("loadDirectory");
    expect(source).toContain("onOpenFile");
    expect(source).toContain("onAtMention");
    expect(source).toContain("t.files.refreshFiles");
    expect(source).not.toContain("<Input");
    expect(source).not.toContain("placeholder=");
  });
});
