import { describe, expect, it } from "vitest";
import {
  createUserContent,
  phaseLabel,
  reduceAgentEvent,
  sessionStats,
  shouldRecoverRuntime,
  streamReducer,
} from "./chat-logic";

describe("chat state logic", () => {
  it("keeps streaming state separate from completed messages", () => {
    const started = streamReducer(
      { isStreaming: false, streamingMessage: null },
      { type: "start" },
    );
    const updated = streamReducer(started, {
      type: "update",
      message: {
        role: "assistant",
        content: [{ type: "text", text: "hello" }],
      },
    });
    expect(updated.isStreaming).toBe(true);
    expect(updated.streamingMessage?.content).toHaveLength(1);
    expect(streamReducer(updated, { type: "end" })).toEqual({
      isStreaming: false,
      streamingMessage: null,
    });
  });

  it("tracks parallel tools through the SSE state machine", () => {
    const initial = {
      running: true,
      stream: { isStreaming: true, streamingMessage: null },
      runningTools: [] as Array<{ toolCallId: string; toolName: string }>,
    };
    const first = reduceAgentEvent(initial, {
      type: "tool_execution_start",
      toolCallId: "a",
      toolName: "read",
    });
    const second = reduceAgentEvent(first, {
      type: "tool_execution_start",
      toolCallId: "b",
      toolName: "bash",
    });
    expect(phaseLabel(second.runningTools, true)).toBe(
      "Running read, bash...",
    );
    expect(
      reduceAgentEvent(second, {
        type: "tool_execution_end",
        toolCallId: "a",
      }).runningTools,
    ).toEqual([{ toolCallId: "b", toolName: "bash" }]);
  });

  it("detects refresh recovery only for a streaming loaded runtime", () => {
    expect(
      shouldRecoverRuntime({ running: true, state: { isStreaming: true } }),
    ).toBe(true);
    expect(
      shouldRecoverRuntime({ running: true, state: { isStreaming: false } }),
    ).toBe(false);
  });

  it("builds pure-image user content", () => {
    expect(createUserContent("", [{ data: "abc", mimeType: "image/png" }])).toEqual([
      {
        type: "image",
        source: { type: "base64", mediaType: "image/png", data: "abc" },
      },
    ]);
  });

  it("accumulates assistant usage", () => {
    expect(
      sessionStats([
        {
          role: "assistant",
          provider: "p",
          model: "m",
          content: [],
          usage: {
            input: 10,
            output: 5,
            cacheRead: 2,
            cacheWrite: 1,
            cost: { total: 0.25 },
          },
        },
      ]),
    ).toEqual({
      input: 10,
      output: 5,
      cacheRead: 2,
      cacheWrite: 1,
      cost: 0.25,
    });
  });
});
