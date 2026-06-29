import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  fileURLToPath(new URL("./chat-center.tsx", import.meta.url)),
  "utf8",
);

describe("chat-center confirm gating", () => {
  it("routes edit and fork through pending confirmation state", () => {
    expect(source).toContain("pendingEdit");
    expect(source).toContain("pendingFork");
    expect(source).toContain("setPendingEdit");
    expect(source).toContain("setPendingFork");
  });

  it("renders a ConfirmActionDialog for both edit and fork", () => {
    expect(source).toContain("<ConfirmActionDialog");
    expect(source).toContain("editConfirmTitle");
    expect(source).toContain("forkConfirmTitle");
  });

  it("only executes edit/fork on confirm, not on click", () => {
    expect(source).toContain("controller.editFromHere(targetId, text)");
    expect(source).toContain("controller.fork(entryId)");
  });
});
