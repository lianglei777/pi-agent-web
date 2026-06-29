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
  draft?: boolean;
}

export interface SessionTreeNode {
  session: SessionInfo;
  children: SessionTreeNode[];
}
