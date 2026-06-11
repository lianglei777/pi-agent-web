export type ThinkingLevel =
  | "auto"
  | "off"
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh";

export type TextContent = { type: "text"; text: string };
export type ImageContent = {
  type: "image";
  source: {
    type: "base64" | "url";
    mediaType?: string;
    data?: string;
    url?: string;
  };
};
export type ThinkingContent = { type: "thinking"; thinking: string };
export type ToolCallContent = {
  type: "toolCall";
  toolCallId: string;
  toolName: string;
  input: Record<string, unknown>;
};
export type TokenUsage = {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  cost: { total: number };
};
export type UserMessage = {
  role: "user";
  content: string | Array<TextContent | ImageContent>;
  timestamp?: number;
  clientId?: string;
  status?: "pending" | "failed";
};
export type AssistantMessage = {
  role: "assistant";
  content: Array<TextContent | ImageContent | ThinkingContent | ToolCallContent>;
  provider: string;
  model: string;
  timestamp?: number;
  usage?: TokenUsage;
  errorMessage?: string;
};
export type ToolResultMessage = {
  role: "toolResult";
  toolCallId: string;
  toolName?: string;
  content: Array<TextContent | ImageContent>;
  isError?: boolean;
  timestamp?: number;
};
export type AgentMessage =
  | UserMessage
  | AssistantMessage
  | ToolResultMessage
  | {
      role: "custom" | "compactionSummary" | "branchSummary" | "bashExecution";
      [key: string]: unknown;
    };

export type SessionTreeNode = {
  entry: {
    id: string;
    parentId: string | null;
    type: string;
    timestamp: string;
    message?: AgentMessage;
    [key: string]: unknown;
  };
  children: SessionTreeNode[];
  label?: string;
};

export type ContextUsage = {
  percent: number | null;
  contextWindow: number;
  tokens: number | null;
};

export type RuntimeState = {
  sessionId: string;
  isStreaming: boolean;
  isCompacting: boolean;
  model?: { id: string; provider: string };
  contextUsage: ContextUsage | null;
  systemPrompt: string;
  thinkingLevel: ThinkingLevel;
};

export type SessionDetail = {
  sessionId: string;
  filePath: string;
  tree: SessionTreeNode[];
  leafId: string | null;
  context: {
    messages: AgentMessage[];
    entryIds: string[];
    thinkingLevel: ThinkingLevel;
    model: { provider: string; modelId: string } | null;
  };
  agentState?: { running: boolean; state?: RuntimeState };
};

export type ModelInfo = {
  id: string;
  name: string;
  provider: string;
  thinkingLevels: ThinkingLevel[];
  thinkingLevelMap?: Record<string, string | null>;
};

export type AgentEvent =
  | { type: "connected"; sessionId: string }
  | { type: "agent_start" | "agent_end" }
  | {
      type: "message_start" | "message_update";
      message: Partial<AssistantMessage>;
    }
  | { type: "message_end"; message: AgentMessage }
  | { type: "tool_execution_start"; toolCallId: string; toolName: string }
  | { type: "tool_execution_end"; toolCallId: string; isError?: boolean }
  | {
      type: "retry_start" | "auto_retry_start";
      attempt: number;
      maxAttempts: number;
      errorMessage?: string;
    }
  | { type: "retry_end" | "auto_retry_end" }
  | { type: "compaction_start" | "auto_compaction_start" }
  | {
      type: "compaction_end" | "auto_compaction_end";
      aborted?: boolean;
      errorMessage?: string;
    };

export type AgentCommand =
  | { type: "prompt" | "steer" | "follow_up"; message: string; images?: ImageInput[] }
  | { type: "abort" | "get_state" | "get_tools" | "abort_compaction" }
  | { type: "set_model"; provider: string; modelId: string }
  | { type: "fork"; entryId: string }
  | { type: "navigate_tree"; targetId: string }
  | { type: "set_thinking_level"; level: ThinkingLevel }
  | { type: "compact"; customInstructions?: string }
  | { type: "set_tools"; toolNames: string[] };

export type ImageInput = { type: "image"; data: string; mimeType: string };
export type AttachedImage = ImageInput & {
  id: string;
  name: string;
  previewUrl: string;
};

export type SessionStats = {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  cost: number;
};
