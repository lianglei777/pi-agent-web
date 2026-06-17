import { describe, expect, it } from "vitest";
import {
  resolveLoadedModelState,
  resolveSubmitTarget,
} from "./chat-controller-state";
import type { ModelInfo } from "./agent-types";

const models = [
  { provider: "openai", id: "gpt-5", name: "GPT-5", thinkingLevels: [] },
  { provider: "anthropic", id: "claude", name: "Claude", thinkingLevels: [] },
] satisfies ModelInfo[];

describe("resolveLoadedModelState", () => {
  it("uses the default model when no model is selected", () => {
    expect(
      resolveLoadedModelState("", {
        models,
        defaultModel: { provider: "anthropic", modelId: "claude" },
      }),
    ).toEqual({
      models,
      modelKey: "anthropic:claude",
    });
  });

  it("keeps the selected model when the model list reloads", () => {
    expect(
      resolveLoadedModelState("openai:gpt-5", {
        models,
        defaultModel: { provider: "anthropic", modelId: "claude" },
      }).modelKey,
    ).toBe("openai:gpt-5");
  });
});

describe("resolveSubmitTarget", () => {
  it("blocks prompt submission before optimistic UI when no session or cwd exists", () => {
    expect(
      resolveSubmitTarget({
        isNew: false,
        mode: "prompt",
        newSessionCwd: null,
        sessionId: null,
      }),
    ).toEqual({ type: "blocked", reason: "NO_SESSION_TARGET" });
  });

  it("targets a new agent when a draft session has a cwd", () => {
    expect(
      resolveSubmitTarget({
        isNew: true,
        mode: "prompt",
        newSessionCwd: "C:\\work",
        sessionId: null,
      }),
    ).toEqual({ type: "new", cwd: "C:\\work" });
  });

  it("targets an existing session for follow-up commands", () => {
    expect(
      resolveSubmitTarget({
        isNew: false,
        mode: "steer",
        newSessionCwd: null,
        sessionId: "session-1",
      }),
    ).toEqual({ type: "existing", sessionId: "session-1" });
  });
});
