import { describe, expect, it } from "vitest";
import {
  getSelectionKey,
  getSelectionProviderName,
  isProviderCollapsed,
} from "./models-config-sidebar-state";
import type { Selection } from "../types";

describe("models config sidebar state", () => {
  it.each([
    [{ type: "provider", name: "openai" }, "provider:openai"],
    [
      { type: "model", providerName: "openai", index: 2 },
      "model:openai:2",
    ],
    [{ type: "apikey", providerId: "anthropic" }, "apikey:anthropic"],
    [{ type: "oauth", providerId: "openai-codex" }, "oauth:openai-codex"],
  ] satisfies Array<[Selection, string]>)(
    "builds a stable key for %j",
    (selection, key) => {
      expect(getSelectionKey(selection)).toBe(key);
    },
  );

  it("returns the owning provider for provider and model selections", () => {
    expect(getSelectionProviderName({ type: "provider", name: "openai" })).toBe(
      "openai",
    );
    expect(
      getSelectionProviderName({
        type: "model",
        providerName: "anthropic",
        index: 0,
      }),
    ).toBe("anthropic");
    expect(
      getSelectionProviderName({ type: "apikey", providerId: "anthropic" }),
    ).toBeNull();
  });

  it("keeps a selected model provider expanded without changing stored collapse state", () => {
    const collapsed = new Set(["openai", "anthropic", "google"]);

    expect(
      isProviderCollapsed(collapsed, "anthropic", {
        type: "model",
        providerName: "anthropic",
        index: 1,
      }),
    ).toBe(false);
    expect(
      isProviderCollapsed(collapsed, "openai", {
        type: "model",
        providerName: "anthropic",
        index: 1,
      }),
    ).toBe(true);
    expect(collapsed).toEqual(new Set(["openai", "anthropic", "google"]));
  });
});
