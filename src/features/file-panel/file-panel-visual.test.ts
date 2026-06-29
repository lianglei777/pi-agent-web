import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  fileURLToPath(new URL("./file-panel.tsx", import.meta.url)),
  "utf8",
);

describe("file panel visual contract", () => {
  it("uses the panel hierarchy without inventing context content", () => {
    expect(source).toContain("bg-panel");
    expect(source).toContain("border-line-subtle");
    expect(source).toContain("t.files.noFileOpen");
    expect(source).not.toContain("Context Inspector");
    expect(source).not.toContain("Active Files");
    expect(source).not.toContain("Card");
  });

  it("places the preview before the file tree without editor features", () => {
    expect(source).toContain("<FileTree");
    expect(source).toContain("cwd");
    expect(source.indexOf("<LoadedFile")).toBeLessThan(
      source.indexOf("<FileTree"),
    );
    expect(source).not.toContain("Tabs");
    expect(source).not.toContain("Editor");
    expect(source).not.toContain("Search");
  });
});
