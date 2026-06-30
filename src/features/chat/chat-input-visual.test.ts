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
    expect(source).toContain(
      "overflow-hidden rounded-lg border bg-elevated",
    );
    expect(source).not.toContain("shadow-[var(--shadow-soft)]");
    expect(source).not.toContain("backdrop-blur");
  });

  it("keeps primary and secondary controls in separate rows", () => {
    expect(source).toContain("border-t border-line-subtle bg-subtle");
    expect(source).toContain("t.chat.input.thinking");
    expect(source).not.toContain("t.chat.input.tools");
    expect(source).not.toContain("changeTools");
    expect(source).toContain("t.chat.input.queue");
    expect(source).toContain("t.chat.input.steer");
    expect(source).toContain("t.chat.input.stopAgent");
    expect(source).toContain("t.chat.input.compact");
  });

  it("does not present tokensBefore as the amount saved", () => {
    expect(source).not.toContain("compactResult.tokensBefore.toLocaleString()");
  });

  it("keeps the compact label stable when the action is unavailable", () => {
    expect(source).not.toContain("t.chat.input.compacted");
  });

  it("explains why the disabled compact action is unavailable", () => {
    expect(source).toContain("<Tooltip>");
    expect(source).toContain("<TooltipTrigger asChild>");
    expect(source).toContain('className="inline-flex"');
    expect(source).toContain("t.chat.input.alreadyCompacted");
    expect(source).toContain("t.chat.input.compactUnavailableWhileRunning");
  });
});
