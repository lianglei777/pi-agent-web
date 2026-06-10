import type {
  SessionContext,
  SessionDetail,
  SessionInfo,
} from "@/server/domain/session";

export interface SessionRepository {
  list(): Promise<SessionInfo[]>;
  findById(sessionId: string): Promise<SessionDetail | null>;
  getContext(
    sessionId: string,
    leafId?: string | null,
  ): Promise<SessionContext | null>;
  rename(sessionId: string, name: string): Promise<void>;
  deleteAndReparent(sessionId: string): Promise<void>;
  resolveStoragePath(sessionId: string): Promise<string | null>;
}

