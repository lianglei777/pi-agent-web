import { describe, expect, it, vi } from "vitest";
import type { AgentRuntime } from "@/server/ports/agent-runtime";
import type { SessionRepository } from "@/server/ports/session-repository";
import { InMemoryAgentRegistry } from "@/server/infrastructure/runtime/in-memory-agent-registry";
import { AgentService } from "./agent-service";

describe("AgentService", () => {
  it("destroys the original runtime after a successful fork", async () => {
    const destroy = vi.fn();
    const runtime: AgentRuntime = {
      sessionId: "original",
      sessionFile: "original.jsonl",
      isAlive: () => true,
      execute: async <T,>() =>
        ({
          sessionId: "forked",
          sessionFile: "forked.jsonl",
        }) as T,
      getState: async () => ({
        sessionId: "original",
        sessionFile: "original.jsonl",
        isStreaming: false,
        isCompacting: false,
        autoCompactionEnabled: true,
        autoRetryEnabled: true,
        contextUsage: null,
        systemPrompt: "",
        thinkingLevel: "off",
      }),
      subscribe: () => () => {},
      destroy,
    };
    const registry = new InMemoryAgentRegistry();
    registry.register("original", runtime);
    const service = new AgentService(
      {} as SessionRepository,
      registry,
      { create: vi.fn() },
      { listRoots: async () => [], addRoot: vi.fn() },
    );

    await expect(
      service.execute("original", {
        type: "fork",
        entryId: "entry-1",
      }),
    ).resolves.toEqual({
      sessionId: "forked",
      sessionFile: "forked.jsonl",
    });

    expect(destroy).toHaveBeenCalledOnce();
    expect(registry.get("original")).toBeUndefined();
  });
});
