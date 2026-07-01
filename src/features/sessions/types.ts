import type { SessionInfo as ApiSessionInfo } from "@/contracts/sessions";

export type {
  Project,
  ProjectBrowseResult,
} from "@/contracts/projects";

export type SessionInfo = ApiSessionInfo & { draft?: boolean };

export interface SessionTreeNode {
  session: SessionInfo;
  children: SessionTreeNode[];
}
