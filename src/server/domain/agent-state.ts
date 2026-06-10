import type { ThinkingLevel } from "./agent-command";

export interface ContextUsage {
  percent: number | null;
  contextWindow: number;
  tokens: number | null;
}

export interface AgentRuntimeState {
  sessionId: string;
  sessionFile: string;
  isStreaming: boolean;
  isCompacting: boolean;
  autoCompactionEnabled: boolean;
  autoRetryEnabled: boolean;
  model?: {
    id: string;
    provider: string;
  };
  contextUsage: ContextUsage | null;
  systemPrompt: string;
  thinkingLevel: ThinkingLevel;
}

export interface AgentRuntimeSnapshot {
  loaded: boolean;
  state?: AgentRuntimeState;
}

