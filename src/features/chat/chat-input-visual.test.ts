import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  fileURLToPath(new URL("./chat-input.tsx", import.meta.url)),
  "utf8",
);

describe("chat input visual contract", () => {
  it("keeps the composer structural and gives focus a semantic accent", () => {
    expect(source).toContain("focus-within:border-ring");
    expect(source).toContain("focus-within:ring-2");
    expect(source).toContain("focus-within:ring-ring/20");
    expect(source).toContain("rounded-md");
    expect(source).not.toContain("shadow-[var(--shadow-soft)]");
    expect(source).not.toContain("backdrop-blur");
  });

  it("keeps primary and secondary controls in separate rows", () => {
    expect(source).toContain("border-t border-line-subtle bg-subtle");
    expect(source).toContain("t.chat.input.thinking");
    expect(source).toContain("t.chat.input.tools");
    expect(source).toContain("t.chat.input.compact");
  });
});
