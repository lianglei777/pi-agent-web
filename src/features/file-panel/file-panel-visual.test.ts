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
});
