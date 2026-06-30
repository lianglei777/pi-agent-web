import { describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  createAgentSession: vi.fn(),
  createSessionManager: vi.fn(),
}));

vi.mock("@earendil-works/pi-coding-agent", () => ({
  createAgentSession: sdk.createAgentSession,
  findCutPoint: vi.fn(),
  SessionManager: {
    create: sdk.createSessionManager,
    open: vi.fn(),
  },
}));

import { PiAgentRuntimeFactory } from "./pi-agent-runtime";

describe("PiAgentRuntimeFactory", () => {
  it("enables the full built-in tool set by default", async () => {
    sdk.createSessionManager.mockReturnValue({});
    sdk.createAgentSession.mockResolvedValue({ session: {} });

    await new PiAgentRuntimeFactory().create({ cwd: "C:\\workspace" });

    expect(sdk.createAgentSession).toHaveBeenCalledWith(
      expect.objectContaining({
        tools: ["bash", "read", "edit", "write", "grep", "find", "ls"],
      }),
    );
  });
});
