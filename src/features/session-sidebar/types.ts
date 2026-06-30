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

export type Project = { path: string; aliases: string[] };

export type ProjectBrowseResult = {
  current: string;
  parent: string | null;
  roots: string[];
  breadcrumbs: Array<{ name: string; path: string }>;
  directories: Array<{ name: string; path: string }>;
};
