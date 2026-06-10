import { describe, expect, it, vi } from "vitest";
import type { AgentRuntime } from "@/server/ports/agent-runtime";
import { InMemoryAgentRegistry } from "./in-memory-agent-registry";

describe("InMemoryAgentRegistry", () => {
  it("shares one start promise for concurrent session restores", async () => {
    const registry = new InMemoryAgentRegistry();
    const runtime = createRuntime("session-1");
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const factory = vi.fn(async () => {
      await gate;
      return runtime;
    });

    const first = registry.getOrStart("session-1", factory);
    const second = registry.getOrStart("session-1", factory);
    release();

    await expect(first).resolves.toBe(runtime);
    await expect(second).resolves.toBe(runtime);
    expect(factory).toHaveBeenCalledTimes(1);
    registry.destroy("session-1");
  });
});

function createRuntime(sessionId: string): AgentRuntime {
  return {
    sessionId,
    sessionFile: `${sessionId}.jsonl`,
    isAlive: () => true,
    execute: async <T,>() => undefined as T,
    getState: async () => ({
      sessionId,
      sessionFile: `${sessionId}.jsonl`,
      isStreaming: false,
      isCompacting: false,
      autoCompactionEnabled: true,
      autoRetryEnabled: true,
      contextUsage: null,
      systemPrompt: "",
      thinkingLevel: "off",
    }),
    subscribe: () => () => {},
    destroy: () => {},
  };
}
