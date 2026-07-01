import type {
  AgentMessage as ApiAgentMessage,
  AgentRuntimeState,
  ThinkingLevel,
  UserMessage as ApiUserMessage,
} from "@/contracts/agent";

export type {
  AgentCommand,
  AgentEvent,
  AgentFailure,
  AgentRuntimeState,
  AssistantMessage,
  CompactionSummaryMessage,
  ContextUsage,
  ImageContent,
  ImageInput,
  TextContent,
  ThinkingContent,
  ThinkingLevel,
  TokenUsage,
  ToolCallContent,
  ToolResultMessage,
} from "@/contracts/agent";

export type UserMessage = ApiUserMessage & {
  clientId?: string;
  status?: "pending" | "failed";
};

export type AgentMessage =
  | Exclude<ApiAgentMessage, ApiUserMessage>
  | UserMessage;

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

export type RuntimeState = AgentRuntimeState;

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
  agentState?: { running: boolean; state?: AgentRuntimeState };
};

export type ModelInfo = {
  id: string;
  name: string;
  provider: string;
  input?: string[];
  thinkingLevels: ThinkingLevel[];
  thinkingDefaultLevel?: Exclude<ThinkingLevel, "auto" | "off">;
  thinkingLevelMap?: Record<string, string | null>;
};

export type AttachedImage = {
  type: "image";
  data: string;
  mimeType: string;
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
