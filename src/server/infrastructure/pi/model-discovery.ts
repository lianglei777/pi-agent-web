import type { Api, Model } from "@earendil-works/pi-ai";
import type {
  DiscoverModelsInput,
  DiscoverModelsResult,
  ModelDiscoverySuggestion,
} from "@/server/domain/model";

interface RemoteModel {
  id: string;
  name?: string;
}

interface FetchModelsInput {
  baseUrl: string;
  apiKey?: string;
  headers?: Record<string, string>;
}

interface DiscoveryDependencies {
  fetchModels: (input: FetchModelsInput) => Promise<RemoteModel[]>;
  catalogModels: Model<Api>[];
}

const DEFAULT_MODEL = {
  reasoning: false,
  input: ["text"] as Array<"text" | "image">,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 128000,
  maxTokens: 16384,
};

export async function buildModelDiscoverySuggestions(
  input: DiscoverModelsInput,
  dependencies: DiscoveryDependencies,
): Promise<DiscoverModelsResult> {
  const provider = input.provider;
  const providerCatalog = dependencies.catalogModels.filter(
    (model) => model.provider === input.providerName,
  );

  let remoteModels: RemoteModel[] = [];
  let remoteError: string | undefined;
  if (provider.baseUrl && isRemoteDiscoverable(provider.api)) {
    try {
      remoteModels = await dependencies.fetchModels({
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKey,
        headers: provider.headers,
      });
    } catch (error) {
      remoteError = error instanceof Error ? error.message : String(error);
    }
  }

  if (remoteModels.length === 0) {
    return {
      models: providerCatalog.map((model) =>
        fromCatalogModel(model, provider.api, "catalog", "high"),
      ),
      remoteError,
    };
  }

  const suggestions = remoteModels.map((remoteModel) => {
    const catalogModel = findCatalogMatch(
      dependencies.catalogModels,
      input.providerName,
      remoteModel.id,
    );
    return catalogModel
      ? fromCatalogModel(catalogModel, provider.api, "inferred", "medium", remoteModel)
      : fromRemoteModel(remoteModel, provider.api);
  });

  return { models: dedupeSuggestions(suggestions), remoteError };
}

export async function fetchOpenAICompatibleModels({
  baseUrl,
  apiKey,
  headers,
}: FetchModelsInput): Promise<RemoteModel[]> {
  const response = await fetch(modelsUrl(baseUrl), {
    headers: {
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      ...headers,
    },
  });
  if (!response.ok) {
    throw new Error(`Model discovery failed (${response.status})`);
  }
  const data = (await response.json()) as unknown;
  const models = parseRemoteModels(data);
  if (models.length === 0) {
    throw new Error("Model discovery returned no models");
  }
  return models;
}

function isRemoteDiscoverable(api: string | undefined) {
  return !api || api === "openai-completions" || api === "openai-responses";
}

function modelsUrl(baseUrl: string) {
  return `${baseUrl.replace(/\/+$/, "")}/models`;
}

function parseRemoteModels(value: unknown): RemoteModel[] {
  if (!value || typeof value !== "object") return [];
  const data = (value as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];
  return data.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as { id?: unknown; name?: unknown };
    if (typeof candidate.id !== "string" || !candidate.id.trim()) return [];
    return [
      {
        id: candidate.id,
        name: typeof candidate.name === "string" ? candidate.name : undefined,
      },
    ];
  });
}

function findCatalogMatch(
  catalogModels: Model<Api>[],
  providerName: string,
  modelId: string,
) {
  return (
    catalogModels.find(
      (model) => model.provider === providerName && model.id === modelId,
    ) ?? catalogModels.find((model) => model.id === modelId)
  );
}

function fromCatalogModel(
  model: Model<Api>,
  api: string | undefined,
  source: ModelDiscoverySuggestion["source"],
  confidence: ModelDiscoverySuggestion["confidence"],
  remoteModel?: RemoteModel,
): ModelDiscoverySuggestion {
  return compactSuggestion({
    source,
    confidence,
    model: {
      id: model.id,
      name: remoteModel?.name ?? model.name,
      reasoning: model.reasoning,
      thinkingLevelMap: model.thinkingLevelMap,
      input: model.input,
      cost: model.cost,
      contextWindow: model.contextWindow,
      maxTokens: model.maxTokens,
      api: api ?? model.api,
      compat: model.compat as Record<string, unknown> | undefined,
    },
  });
}

function fromRemoteModel(
  remoteModel: RemoteModel,
  api: string | undefined,
): ModelDiscoverySuggestion {
  return compactSuggestion({
    source: "defaulted",
    confidence: "low",
    model: {
      id: remoteModel.id,
      name: remoteModel.name ?? remoteModel.id,
      ...DEFAULT_MODEL,
      api,
    },
  });
}

function compactSuggestion(
  suggestion: ModelDiscoverySuggestion,
): ModelDiscoverySuggestion {
  return {
    ...suggestion,
    model: Object.fromEntries(
      Object.entries(suggestion.model).filter(([, value]) => value !== undefined),
    ) as ModelDiscoverySuggestion["model"],
  };
}

function dedupeSuggestions(suggestions: ModelDiscoverySuggestion[]) {
  const seen = new Set<string>();
  return suggestions.filter((suggestion) => {
    const id = suggestion.model.id.trim();
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
