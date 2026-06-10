import type { ThinkingLevel } from "./agent-command";

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  contextWindow?: number;
  maxTokens?: number;
  input?: Array<"text" | "image">;
  thinkingLevels: ThinkingLevel[];
  thinkingLevelMap?: Record<string, string | null>;
}

export interface TestModelInput {
  provider: string;
  modelId: string;
  config?: Record<string, unknown>;
  timeoutMs?: number;
}

export interface TestModelResult {
  ok: boolean;
  latencyMs?: number;
  status?: number;
  responseText?: string;
  error?: string;
}

