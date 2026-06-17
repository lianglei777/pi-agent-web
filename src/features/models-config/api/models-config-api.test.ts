import { afterEach, describe, expect, it, vi } from "vitest";
import { loadModelsConfigData, normalizeModelsConfig } from "./models-config-api";

afterEach(() => vi.unstubAllGlobals());

describe("models config client contract", () => {
  it("normalizes invalid config values", () => {
    expect(normalizeModelsConfig(null)).toEqual({ providers: {} });
    expect(normalizeModelsConfig({ providers: [] })).toEqual({
      providers: {},
    });
  });

  it("preserves valid config data", () => {
    const config = {
      providers: { local: { api: "openai-completions" } },
      extra: true,
    };
    expect(normalizeModelsConfig(config)).toEqual(config);
  });

  it("loads bootstrap data without per-provider API key status requests", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      expect(String(input)).toBe("/api/models-config/bootstrap");
      return Response.json({
        config: { providers: { custom: { api: "openai-completions" } } },
        oauthProviders: [{ id: "openai-codex", name: "OpenAI Codex" }],
        apiKeyProviders: [
          {
            id: "anthropic",
            name: "Anthropic",
            configured: true,
            source: "stored",
            label: "Stored API key",
            modelCount: 2,
          },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadModelsConfigData()).resolves.toEqual({
      config: { providers: { custom: { api: "openai-completions" } } },
      oauthProviders: [{ id: "openai-codex", name: "OpenAI Codex" }],
      apiKeyProviders: [
        {
          id: "anthropic",
          name: "Anthropic",
          configured: true,
          source: "stored",
          label: "Stored API key",
          modelCount: 2,
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
