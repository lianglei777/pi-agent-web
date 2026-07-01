import type { AgentRuntimeSnapshot } from "@/contracts/agent";
import type { SessionDetailResponse } from "@/contracts/sessions";

export type {
  SessionContext,
  SessionEntry,
  SessionInfo,
  SessionTreeNode,
} from "@/contracts/sessions";

export interface SessionDetail
  extends Omit<SessionDetailResponse, "agentState"> {
  agentState?: AgentRuntimeSnapshot;
}
