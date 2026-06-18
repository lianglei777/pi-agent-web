import type { ThinkingLevel } from "./agent-command";

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  contextWindow?: number;
  maxTokens?: number;
  input?: Array<"text" | "image">;
  thinkingLevels: ThinkingLevel[];
  thinkingDefaultLevel?: Exclude<ThinkingLevel, "auto" | "off">;
  thinkingLevelMap?: Record<string, string | null>;
}

export interface TestModelInput {
  provider: string;
  modelId: string;
  config?: Record<string, unknown>;
  timeoutMs?: number;
}

export interface DiscoverModelsInput {
  providerName: string;
  provider: {
    api?: string;
    baseUrl?: string;
    apiKey?: string;
    headers?: Record<string, string>;
  };
}

export type ModelDiscoverySource = "catalog" | "remote" | "inferred" | "defaulted";
export type ModelDiscoveryConfidence = "high" | "medium" | "low";

export interface ModelDiscoverySuggestion {
  source: ModelDiscoverySource;
  confidence: ModelDiscoveryConfidence;
  model: {
    id: string;
    name?: string;
    api?: string;
    reasoning?: boolean;
    thinkingLevelMap?: Record<string, string | null>;
    input?: Array<"text" | "image">;
    contextWindow?: number;
    maxTokens?: number;
    cost?: {
      input?: number;
      output?: number;
      cacheRead?: number;
      cacheWrite?: number;
    };
    compat?: Record<string, unknown>;
  };
}

export interface DiscoverModelsResult {
  models: ModelDiscoverySuggestion[];
  remoteError?: string;
}

export interface TestModelResult {
  ok: boolean;
  latencyMs?: number;
  status?: number;
  responseText?: string;
  error?: string;
}

