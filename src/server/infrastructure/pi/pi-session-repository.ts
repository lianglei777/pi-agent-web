import { promises as fs } from "node:fs";
import path from "node:path";
import {
  buildSessionContext,
  SessionManager,
  type SessionEntry as PiSessionEntry,
} from "@earendil-works/pi-coding-agent";
import type { ThinkingLevel } from "@/server/domain/agent-command";
import { AppError } from "@/server/domain/app-error";
import type {
  SessionContext,
  SessionDetail,
  SessionEntry,
  SessionInfo,
  SessionTreeNode,
} from "@/server/domain/session";
import type { SessionRepository } from "@/server/ports/session-repository";
import { mapPiMessage } from "./message-mapper";

type RawHeader = {
  type: "session";
  id: string;
  cwd: string;
  timestamp: string;
  parentSession?: string;
  [key: string]: unknown;
};

type PiTreeNode = {
  entry: PiSessionEntry;
  children: PiTreeNode[];
  label?: string;
};

export class PiSessionRepository implements SessionRepository {
  private readonly paths = new Map<string, string>();

  async list(): Promise<SessionInfo[]> {
    const sessions = await SessionManager.listAll();
    const idsByPath = new Map(
      sessions.map((session) => [path.resolve(session.path), session.id]),
    );
    this.paths.clear();
    for (const session of sessions) this.paths.set(session.id, session.path);

    return sessions.map((session) => ({
      id: session.id,
      path: session.path,
      cwd: session.cwd,
      name: session.name,
      created: session.created.toISOString(),
      modified: session.modified.toISOString(),
      messageCount: session.messageCount,
      firstMessage: session.firstMessage,
      parentSessionId: session.parentSessionPath
        ? idsByPath.get(path.resolve(session.parentSessionPath))
        : undefined,
    }));
  }

  async findById(sessionId: string): Promise<SessionDetail | null> {
    const filePath = await this.resolveStoragePath(sessionId);
    if (!filePath) return null;

    const manager = SessionManager.open(filePath);
    const listed = (await this.list()).find((item) => item.id === sessionId);
    const leafId = manager.getLeafId();
    return {
      sessionId,
      filePath,
      info: listed ?? null,
      tree: manager.getTree().map(mapTreeNode),
      leafId,
      context: buildAlignedContext(manager, leafId),
    };
  }

  async getContext(
    sessionId: string,
    leafId?: string | null,
  ): Promise<SessionContext | null> {
    const filePath = await this.resolveStoragePath(sessionId);
    if (!filePath) return null;
    const manager = SessionManager.open(filePath);
    if (leafId && !manager.getEntry(leafId)) return null;
    return buildAlignedContext(manager, leafId ?? manager.getLeafId());
  }

  async rename(sessionId: string, name: string): Promise<void> {
    const filePath = await this.requiredPath(sessionId);
    SessionManager.open(filePath).appendSessionInfo(name);
  }

  async deleteAndReparent(sessionId: string): Promise<void> {
    const filePath = await this.requiredPath(sessionId);
    const deletedHeader = await readHeader(filePath);
    const sessions = await SessionManager.listAll();

    await Promise.all(
      sessions
        .filter(
          (session) =>
            path.resolve(session.parentSessionPath ?? "") ===
            path.resolve(filePath),
        )
        .map(async (child) => {
          const lines = (await fs.readFile(child.path, "utf8")).split(/\r?\n/);
          const header = JSON.parse(lines[0]) as RawHeader;
          if (deletedHeader.parentSession) {
            header.parentSession = deletedHeader.parentSession;
          } else {
            delete header.parentSession;
          }
          lines[0] = JSON.stringify(header);
          await atomicWrite(child.path, lines.join("\n"));
        }),
    );

    await fs.unlink(filePath);
    this.paths.delete(sessionId);
  }

  async resolveStoragePath(sessionId: string): Promise<string | null> {
    const cached = this.paths.get(sessionId);
    if (cached) {
      try {
        await fs.access(cached);
        return cached;
      } catch {
        this.paths.delete(sessionId);
      }
    }
    await this.list();
    return this.paths.get(sessionId) ?? null;
  }

  private async requiredPath(sessionId: string): Promise<string> {
    const filePath = await this.resolveStoragePath(sessionId);
    if (!filePath) {
      throw new AppError(
        "SESSION_NOT_FOUND",
        `Session ${sessionId} was not found`,
        404,
      );
    }
    return filePath;
  }
}

export function buildAlignedContext(
  manager: SessionManager,
  leafId: string | null,
): SessionContext {
  const pathEntries = leafId ? manager.getBranch(leafId) : [];
  const sdkContext = buildSessionContext(manager.getEntries(), leafId);
  let thinkingLevel = sdkContext.thinkingLevel as ThinkingLevel;
  let model = sdkContext.model;
  const messages = sdkContext.messages.map(mapPiMessage);
  const entryIds = contextEntryIds(pathEntries);

  if (messages.length !== entryIds.length) {
    throw new AppError(
      "INTERNAL_ERROR",
      "Session context messages and entryIds are not aligned",
      500,
      { messages: messages.length, entryIds: entryIds.length },
    );
  }

  for (const entry of pathEntries) {
    if (entry.type === "thinking_level_change") {
      thinkingLevel = entry.thinkingLevel as ThinkingLevel;
    }
    if (entry.type === "model_change") {
      model = { provider: entry.provider, modelId: entry.modelId };
    }
  }
  return { messages, entryIds, thinkingLevel, model };
}

function contextEntryIds(entries: PiSessionEntry[]): string[] {
  const compaction = [...entries]
    .reverse()
    .find((entry) => entry.type === "compaction");
  const isMessageEntry = (entry: PiSessionEntry) =>
    entry.type === "message" ||
    entry.type === "custom_message" ||
    (entry.type === "branch_summary" && Boolean(entry.summary));

  if (!compaction || compaction.type !== "compaction") {
    return entries.filter(isMessageEntry).map((entry) => entry.id);
  }

  const compactionIndex = entries.findIndex(
    (entry) => entry.id === compaction.id,
  );
  const ids = [compaction.id];
  let keep = false;
  for (let index = 0; index < compactionIndex; index += 1) {
    const entry = entries[index];
    if (entry.id === compaction.firstKeptEntryId) keep = true;
    if (keep && isMessageEntry(entry)) ids.push(entry.id);
  }
  for (let index = compactionIndex + 1; index < entries.length; index += 1) {
    const entry = entries[index];
    if (isMessageEntry(entry)) ids.push(entry.id);
  }
  return ids;
}

function mapTreeNode(node: PiTreeNode): SessionTreeNode {
  return {
    entry: mapEntry(node.entry),
    children: node.children.map((child) => mapTreeNode(child)),
    label: node.label,
  };
}

function mapEntry(entry: PiSessionEntry): SessionEntry {
  const mapped: SessionEntry = {
    id: entry.id,
    parentId: entry.parentId,
    type: entry.type,
    timestamp: entry.timestamp,
  };
  for (const [key, value] of Object.entries(entry)) {
    if (!["id", "parentId", "type", "timestamp", "message"].includes(key)) {
      mapped[key] = value;
    }
  }
  if (entry.type === "message") mapped.message = mapPiMessage(entry.message);
  return mapped;
}

async function readHeader(filePath: string): Promise<RawHeader> {
  const firstLine = (await fs.readFile(filePath, "utf8")).split(/\r?\n/, 1)[0];
  return JSON.parse(firstLine) as RawHeader;
}

async function atomicWrite(filePath: string, content: string): Promise<void> {
  const temporary = `${filePath}.${process.pid}.tmp`;
  await fs.writeFile(temporary, content, "utf8");
  await fs.rename(temporary, filePath);
}
