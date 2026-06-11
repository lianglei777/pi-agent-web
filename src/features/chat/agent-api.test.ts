import { afterEach, describe, expect, it, vi } from "vitest";
import { createAgent, sendCommand } from "./agent-api";

afterEach(() => vi.unstubAllGlobals());

describe("agent API adapter", () => {
  it("sends the lazy new-session payload including images", async () => {
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        {
          void _input;
          void _init;
          return Response.json({ sessionId: "new-session" });
        },
    );
    vi.stubGlobal("fetch", fetchMock);
    await createAgent({
      cwd: "C:\\work",
      message: "",
      images: [{ type: "image", data: "abc", mimeType: "image/png" }],
      provider: "provider",
      modelId: "model",
      thinkingLevel: "high",
      toolNames: ["read"],
    });
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      cwd: "C:\\work",
      message: "",
      images: [{ data: "abc", mimeType: "image/png" }],
      provider: "provider",
      modelId: "model",
      thinkingLevel: "high",
      toolNames: ["read"],
    });
  });

  it.each([
    { type: "fork", entryId: "entry" },
    { type: "navigate_tree", targetId: "leaf" },
    { type: "compact" },
    { type: "abort_compaction" },
  ] as const)("passes through $type commands", async (command) => {
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        {
          void _input;
          void _init;
          return Response.json({ success: true });
        },
    );
    vi.stubGlobal("fetch", fetchMock);
    await sendCommand("session", command);
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual(command);
  });
});
