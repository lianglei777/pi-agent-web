import { describe, expect, it, vi } from "vitest";
import { createSseResponse } from "./sse-stream";

describe("createSseResponse", () => {
  it("runs subscription cleanup when the client disconnects", async () => {
    const abortController = new AbortController();
    const cleanup = vi.fn();
    const request = new Request("http://localhost/events", {
      signal: abortController.signal,
    });
    const response = createSseResponse({
      request,
      initial: { type: "connected" },
      subscribe: async () => cleanup,
    });
    const reader = response.body!.getReader();

    await reader.read();
    abortController.abort();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(cleanup).toHaveBeenCalledOnce();
    await expect(reader.read()).resolves.toMatchObject({ done: true });
  });
});
