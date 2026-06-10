import type { AgentRuntimeSnapshot } from "./agent-state";
import type { ThinkingLevel } from "./agent-command";
import type { AgentMessage } from "./message";

export interface SessionInfo {
  id: string;
  path: string;
  cwd: string;
  name?: string;
  created: string;
  modified: string;
  messageCount: number;
  firstMessage: string;
  parentSessionId?: string;
}

export interface SessionEntry {
  id: string;
  parentId: string | null;
  type: string;
  timestamp: string;
  message?: AgentMessage;
  [key: string]: unknown;
}

export interface SessionTreeNode {
  entry: SessionEntry;
  children: SessionTreeNode[];
  label?: string;
}

export interface SessionContext {
  messages: AgentMessage[];
  entryIds: string[];
  thinkingLevel: ThinkingLevel;
  model: {
    provider: string;
    modelId: string;
  } | null;
}

export interface SessionDetail {
  sessionId: string;
  filePath: string;
  info: SessionInfo | null;
  tree: SessionTreeNode[];
  leafId: string | null;
  context: SessionContext;
  agentState?: AgentRuntimeSnapshot;
}

