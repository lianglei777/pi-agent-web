import { SessionManager } from "@earendil-works/pi-coding-agent";
import { describe, expect, it } from "vitest";
import { buildAlignedContext } from "./pi-session-repository";

describe("buildAlignedContext", () => {
  it("builds the requested leaf instead of the manager's current leaf", () => {
    const manager = SessionManager.inMemory("C:\\workspace");
    const rootId = manager.appendMessage({
      role: "user",
      content: "root",
      timestamp: Date.now(),
    });
    const originalLeafId = manager.appendMessage({
      role: "user",
      content: "original",
      timestamp: Date.now(),
    });

    manager.branch(rootId);
    manager.appendMessage({
      role: "user",
      content: "branch",
      timestamp: Date.now(),
    });

    const context = buildAlignedContext(manager, originalLeafId);

    expect(context.messages).toEqual([
      expect.objectContaining({ role: "user", content: "root" }),
      expect.objectContaining({ role: "user", content: "original" }),
    ]);
    expect(context.entryIds).toEqual([rootId, originalLeafId]);
  });

  it("keeps compaction summaries aligned with their source entry ids", () => {
    const manager = SessionManager.inMemory("C:\\workspace");
    manager.appendMessage({
      role: "user",
      content: "discarded",
      timestamp: Date.now(),
    });
    const keptId = manager.appendMessage({
      role: "user",
      content: "kept",
      timestamp: Date.now(),
    });
    const compactionId = manager.appendCompaction(
      "summary",
      keptId,
      100,
    );

    const context = buildAlignedContext(manager, compactionId);

    expect(context.messages).toHaveLength(2);
    expect(context.entryIds).toEqual([compactionId, keptId]);
    expect(context.messages[0].role).toBe("compactionSummary");
    expect(context.messages[1]).toMatchObject({
      role: "user",
      content: "kept",
    });
  });
});
