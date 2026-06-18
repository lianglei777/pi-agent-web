import { describe, expect, it } from "vitest";
import { mergeDiscoveredModels } from "./model-discovery-merge";
import type { ModelDiscoverySuggestion, ModelsJson } from "../types";

describe("mergeDiscoveredModels", () => {
  it("adds only new discovered models and selects the first inserted model", () => {
    const config: ModelsJson = {
      providers: {
        custom: {
          api: "openai-completions",
          models: [{ id: "existing" }],
        },
      },
    };
    const suggestions: ModelDiscoverySuggestion[] = [
      {
        source: "remote",
        confidence: "medium",
        model: { id: "existing", name: "Existing" },
      },
      {
        source: "defaulted",
        confidence: "low",
        model: {
          id: "new-model",
          reasoning: true,
          contextWindow: 128000,
          maxTokens: 16384,
        },
      },
    ];

    expect(mergeDiscoveredModels(config, "custom", suggestions)).toEqual({
      config: {
        providers: {
          custom: {
            api: "openai-completions",
            models: [
              { id: "existing" },
              {
                id: "new-model",
                reasoning: true,
                thinkingDefaultLevel: "high",
                contextWindow: 128000,
                maxTokens: 16384,
                provenance: { source: "defaulted", confidence: "low" },
              },
            ],
          },
        },
      },
      insertedCount: 1,
      selection: { type: "model", providerName: "custom", index: 1 },
    });
  });

  it("keeps selection on the provider when every suggestion already exists", () => {
    const config: ModelsJson = {
      providers: { custom: { models: [{ id: "existing" }] } },
    };

    expect(
      mergeDiscoveredModels(config, "custom", [
        {
          source: "remote",
          confidence: "medium",
          model: { id: "existing" },
        },
      ]),
    ).toEqual({
      config,
      insertedCount: 0,
      selection: { type: "provider", name: "custom" },
    });
  });
});
