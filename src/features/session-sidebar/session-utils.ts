import type { SessionInfo, SessionTreeNode } from "./types";
import type { Locale } from "@/i18n/locales";

export function getSessionTitle(session: SessionInfo) {
  return (
    session.name?.trim() ||
    session.firstMessage.trim().slice(0, 50) ||
    session.id.slice(0, 12)
  );
}

function getProjectCwds(sessions: SessionInfo[]) {
  const latestByCwd = new Map<string, string>();
  for (const session of sessions) {
    if (!session.cwd) continue;
    const previous = latestByCwd.get(session.cwd);
    if (!previous || session.modified > previous) {
      latestByCwd.set(session.cwd, session.modified);
    }
  }
  return [...latestByCwd]
    .sort((left, right) => right[1].localeCompare(left[1]))
    .map(([cwd]) => cwd);
}

export function getRecentCwds(sessions: SessionInfo[]) {
  return getProjectCwds(sessions).slice(0, 5);
}

export function groupSessionsByCwd(sessions: SessionInfo[]) {
  return getProjectCwds(sessions).map((cwd) => ({
    cwd,
    nodes: buildSessionTree(
      sessions.filter((session) => session.cwd === cwd),
    ),
  }));
}

export function getProjectName(cwd: string) {
  const segments = cwd.split(/[\\/]+/).filter(Boolean);
  return segments[segments.length - 1] ?? cwd;
}

export function shortenCwd(cwd: string, home = "") {
  const normalizedHome = home.replace(/[\\/]+$/, "");
  let display =
    normalizedHome &&
    (cwd === normalizedHome ||
      cwd.startsWith(`${normalizedHome}\\`) ||
      cwd.startsWith(`${normalizedHome}/`))
      ? `~${cwd.slice(normalizedHome.length)}`
      : cwd;
  const prefix = display.startsWith("~") ? "~" : "";
  const segments = display.split(/[\\/]+/).filter(Boolean);
  if (segments.length > 2) {
    display = `${prefix ? "~/.../" : ".../"}${segments.slice(-2).join("/")}`;
  }
  return display;
}

export function formatRelativeTime(
  value: string,
  now = Date.now(),
  locale: Locale = "en",
) {
  const elapsed = Math.max(0, now - new Date(value).getTime());
  const minutes = Math.floor(elapsed / 60_000);
  if (locale === "zh") {
    if (minutes < 1) return "刚刚";
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    if (days <= 7) return `${days}天前`;
    return new Date(value).toLocaleDateString("zh-CN");
  }

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days <= 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString("en");
}

export function buildSessionTree(sessions: SessionInfo[]): SessionTreeNode[] {
  const allById = new Map(sessions.map((session) => [session.id, session]));
  const nodes = new Map<string, SessionTreeNode>(
    sessions.map((session) => [
      session.id,
      { session, children: [] } satisfies SessionTreeNode,
    ]),
  );
  const roots: SessionTreeNode[] = [];

  for (const session of sessions) {
    const node = nodes.get(session.id);
    if (!node) continue;
    let parentId = session.parentSessionId;
    const visited = new Set([session.id]);
    let survivingParent: string | undefined;
    while (parentId) {
      if (visited.has(parentId)) {
        survivingParent = undefined;
        break;
      }
      visited.add(parentId);
      if (nodes.has(parentId)) {
        survivingParent = parentId;
      }
      parentId = allById.get(parentId)?.parentSessionId;
    }
    if (survivingParent) {
      nodes.get(survivingParent)?.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (items: SessionTreeNode[]) => {
    items.sort((left, right) =>
      right.session.modified.localeCompare(left.session.modified),
    );
    items.forEach((item) => sortNodes(item.children));
  };
  sortNodes(roots);
  return roots;
}
