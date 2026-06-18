import type {
  ModelDiscoverySuggestion,
  ModelsJson,
  Selection,
} from "../types";

export function mergeDiscoveredModels(
  config: ModelsJson,
  providerName: string,
  suggestions: ModelDiscoverySuggestion[],
): {
  config: ModelsJson;
  insertedCount: number;
  selection: Selection;
} {
  const provider = config.providers?.[providerName];
  if (!provider) {
    return {
      config,
      insertedCount: 0,
      selection: { type: "provider", name: providerName },
    };
  }

  const existingModels = provider.models ?? [];
  const existingIds = new Set(existingModels.map((model) => model.id));
  const newModels = suggestions
    .map((suggestion) => ({
      ...suggestion.model,
      thinkingDefaultLevel:
        suggestion.model.thinkingDefaultLevel ??
        (suggestion.model.reasoning ? "high" : undefined),
      provenance: {
        source: suggestion.source,
        confidence: suggestion.confidence,
      },
    }))
    .filter((model) => model.id.trim() && !existingIds.has(model.id));

  if (newModels.length === 0) {
    return {
      config,
      insertedCount: 0,
      selection: { type: "provider", name: providerName },
    };
  }

  return {
    config: {
      ...config,
      providers: {
        ...(config.providers ?? {}),
        [providerName]: {
          ...provider,
          models: [...existingModels, ...newModels],
        },
      },
    },
    insertedCount: newModels.length,
    selection: {
      type: "model",
      providerName,
      index: existingModels.length,
    },
  };
}
