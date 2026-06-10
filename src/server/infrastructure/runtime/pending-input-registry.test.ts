import { describe, expect, it } from "vitest";
import { AppError } from "@/server/domain/app-error";
import { PendingInputRegistry } from "./pending-input-registry";

describe("PendingInputRegistry", () => {
  it("only accepts input from the provider that created the token", async () => {
    const registry = new PendingInputRegistry();
    const pending = registry.create("anthropic");

    expect(() =>
      registry.resolve(pending.token, "openai", "wrong"),
    ).toThrow(AppError);
    expect(registry.has(pending.token)).toBe(true);

    registry.resolve(pending.token, "anthropic", "code");
    await expect(pending.promise).resolves.toBe("code");
    expect(registry.has(pending.token)).toBe(false);
  });

  it("rejects and removes pending input when OAuth is aborted", async () => {
    const registry = new PendingInputRegistry();
    const abortController = new AbortController();
    const pending = registry.create("anthropic", abortController.signal);

    abortController.abort();

    await expect(pending.promise).rejects.toThrow("aborted");
    expect(registry.has(pending.token)).toBe(false);
  });
});
