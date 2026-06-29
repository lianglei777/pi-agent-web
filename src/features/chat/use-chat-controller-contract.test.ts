import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  fileURLToPath(new URL("./use-chat-controller.ts", import.meta.url)),
  "utf8",
);

describe("chat runtime state synchronization", () => {
  it("restores runtime state when an opened session is not loaded", () => {
    expect(source).toContain('type: "get_state"');
    expect(source).toContain("syncRuntimeState(runtimeState)");
  });
});

describe("edit-from-here undo and branch exposure", () => {
  it("captures the previous leaf as undoable before navigating", () => {
    expect(source).toContain("const [undoable, setUndoable]");
    expect(source).toContain("setUndoable({ leafId: prev })");
  });

  it("exposes undoEdit that navigates back to the captured leaf", () => {
    expect(source).toContain("async function undoEdit");
    expect(source).toContain("await changeLeaf(leafId)");
  });

  it("auto-clears undoable after a timeout like compact feedback", () => {
    expect(source).toMatch(/if \(!undoable\) return/);
  });

  it("exposes branch tree state and changeLeaf to consumers", () => {
    expect(source).toContain("    tree,");
    expect(source).toContain("    activeLeafId,");
    expect(source).toContain("    changeLeaf,");
    expect(source).toContain("    undoable,");
    expect(source).toContain("    undoEdit,");
    expect(source).toContain("    dismissUndo:");
  });
});
