import type { SessionInfo } from "./types";

export type DraftSessionInput = {
  temporaryId: string;
  cwd: string;
  label: string;
  now: string;
};

export function createDraftSession({
  temporaryId,
  cwd,
  label,
  now,
}: DraftSessionInput): SessionInfo {
  return {
    id: temporaryId,
    path: `draft:${temporaryId}`,
    cwd,
    name: label,
    created: now,
    modified: now,
    messageCount: 0,
    firstMessage: "",
    draft: true,
  };
}
