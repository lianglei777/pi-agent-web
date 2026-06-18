import { describe, expect, it, vi } from "vitest";
import { buildModelDiscoverySuggestions } from "./model-discovery";

describe("buildModelDiscoverySuggestions", () => {
  it("enriches remote model ids with catalog metadata when available", async () => {
    const fetchModels = vi.fn().mockResolvedValue([
      { id: "gpt-4.1", name: "GPT 4.1" },
      { id: "provider-new-model" },
    ]);

    const result = await buildModelDiscoverySuggestions(
      {
        providerName: "custom-openai",
        provider: {
          api: "openai-completions",
          baseUrl: "https://api.example.com/v1",
          apiKey: "sk-test",
        },
      },
      {
        fetchModels,
        catalogModels: [
          {
            id: "gpt-4.1",
            name: "GPT 4.1",
            api: "openai-responses",
            provider: "openai",
            baseUrl: "https://api.openai.com/v1",
            reasoning: false,
            input: ["text", "image"],
            cost: { input: 2, output: 8, cacheRead: 0.5, cacheWrite: 1 },
            contextWindow: 1047576,
            maxTokens: 32768,
          },
        ],
      },
    );

    expect(fetchModels).toHaveBeenCalledWith({
      baseUrl: "https://api.example.com/v1",
      apiKey: "sk-test",
      headers: undefined,
    });
    expect(result).toEqual({
      models: [
        {
          source: "inferred",
          confidence: "medium",
          model: {
            id: "gpt-4.1",
            name: "GPT 4.1",
            reasoning: false,
            input: ["text", "image"],
            cost: { input: 2, output: 8, cacheRead: 0.5, cacheWrite: 1 },
            contextWindow: 1047576,
            maxTokens: 32768,
            api: "openai-completions",
          },
        },
        {
          source: "defaulted",
          confidence: "low",
          model: {
            id: "provider-new-model",
            name: "provider-new-model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            maxTokens: 16384,
            api: "openai-completions",
          },
        },
      ],
      remoteError: undefined,
    });
  });

  it("falls back to provider catalog models when remote discovery fails", async () => {
    const result = await buildModelDiscoverySuggestions(
      {
        providerName: "openai",
        provider: {
          api: "openai-responses",
          baseUrl: "https://api.openai.com/v1",
        },
      },
      {
        fetchModels: vi.fn().mockRejectedValue(new Error("unauthorized")),
        catalogModels: [
          {
            id: "gpt-4.1",
            name: "GPT 4.1",
            api: "openai-responses",
            provider: "openai",
            baseUrl: "https://api.openai.com/v1",
            reasoning: false,
            input: ["text"],
            cost: { input: 2, output: 8, cacheRead: 0.5, cacheWrite: 1 },
            contextWindow: 1047576,
            maxTokens: 32768,
          },
        ],
      },
    );

    expect(result.models).toEqual([
      {
        source: "catalog",
        confidence: "high",
        model: {
          id: "gpt-4.1",
          name: "GPT 4.1",
          reasoning: false,
          input: ["text"],
          cost: { input: 2, output: 8, cacheRead: 0.5, cacheWrite: 1 },
          contextWindow: 1047576,
          maxTokens: 32768,
          api: "openai-responses",
        },
      },
    ]);
    expect(result.remoteError).toBe("unauthorized");
  });
});
