import type {
  AgentMessage as ApiAgentMessage,
  AgentRuntimeState,
  ThinkingLevel,
  UserMessage as ApiUserMessage,
} from "@/contracts/agent";
import type { SessionDetailResponse } from "@/contracts/sessions";

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
export type { SessionTreeNode } from "@/contracts/sessions";

export type UserMessage = ApiUserMessage & {
  clientId?: string;
  status?: "pending" | "failed";
};

export type AgentMessage =
  | Exclude<ApiAgentMessage, ApiUserMessage>
  | UserMessage;

export type RuntimeState = AgentRuntimeState;
export type SessionDetail = SessionDetailResponse;

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
