"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Check, ChevronRight, Folder, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useI18n } from "@/i18n/use-i18n";
import { loadDefaultCwd, loadSessions } from "./api";
import { CwdPicker } from "./cwd-picker";
import { createDraftSession } from "./session-draft";
import {
  getProjectName,
  getRecentCwds,
  groupSessionsByCwd,
} from "./session-utils";
import { SessionTree } from "./session-tree";
import type { SessionInfo } from "./types";

export type SessionSidebarProps = {
  selectedSessionId: string | null;
  selectedCwd: string | null;
  initialSessionId?: string | null;
  refreshKey?: number;
  draftSession?: { id: string; cwd: string; created: string } | null;
  onSelectSession: (session: SessionInfo, isRestore?: boolean) => void;
  onNewSession: (temporaryId: string, cwd: string) => void;
  onSessionDeleted: (session: SessionInfo) => void;
  onCwdChange: (cwd: string) => void;
  onInitialRestoreDone?: () => void;
};

export function SessionSidebar({
  selectedSessionId,
  selectedCwd,
  initialSessionId,
  refreshKey = 0,
  draftSession,
  onSelectSession,
  onNewSession,
  onSessionDeleted,
  onCwdChange,
  onInitialRestoreDone,
}: SessionSidebarProps) {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshed, setRefreshed] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set(),
  );
  const restoreAttempted = useRef(false);
  const feedbackTimer = useRef<number | null>(null);
  const { t } = useI18n();

  const refresh = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        setSessions(await loadSessions());
        setError("");
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : t.sessions.unableToLoadSessions,
        );
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [t.sessions.unableToLoadSessions],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(true), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    if (!refreshKey) return;
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh, refreshKey]);

  useEffect(() => {
    return () => {
      if (feedbackTimer.current !== null) {
        window.clearTimeout(feedbackTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!selectedCwd) return;
    setExpandedProjects((current) => {
      if (current.has(selectedCwd)) return current;
      const next = new Set(current);
      next.add(selectedCwd);
      return next;
    });
  }, [selectedCwd]);

  const recentCwds = useMemo(() => getRecentCwds(sessions), [sessions]);
  const navigableSessions = useMemo(() => {
    if (!draftSession) return sessions;
    return [
      ...sessions,
      createDraftSession({
        temporaryId: draftSession.id,
        cwd: draftSession.cwd,
        label: t.sessions.draft,
        now: draftSession.created,
      }),
    ];
  }, [draftSession, sessions, t.sessions.draft]);
  const projectGroups = useMemo(
    () => groupSessionsByCwd(navigableSessions),
    [navigableSessions],
  );
  const displayedGroups = useMemo(() => {
    if (
      !selectedCwd ||
      projectGroups.some((group) => group.cwd === selectedCwd)
    ) {
      return projectGroups;
    }
    return [{ cwd: selectedCwd, nodes: [] }, ...projectGroups];
  }, [projectGroups, selectedCwd]);

  useEffect(() => {
    if (
      loading ||
      initialSessionId === undefined ||
      restoreAttempted.current
    ) {
      return;
    }
    restoreAttempted.current = true;
    if (initialSessionId) {
      const restored = sessions.find((session) => session.id === initialSessionId);
      if (restored) {
        onCwdChange(restored.cwd);
        onSelectSession(restored, true);
        return;
      }
      onInitialRestoreDone?.();
    }
    if (!selectedCwd && recentCwds[0]) {
      onCwdChange(recentCwds[0]);
      return;
    }
    if (!selectedCwd) {
      void loadDefaultCwd()
        .then(({ cwd }) => onCwdChange(cwd))
        .catch(() => undefined);
    }
  }, [
    initialSessionId,
    loading,
    onCwdChange,
    onInitialRestoreDone,
    onSelectSession,
    recentCwds,
    selectedCwd,
    sessions,
  ]);

  async function manualRefresh() {
    await refresh();
    setRefreshed(true);
    if (feedbackTimer.current !== null) {
      window.clearTimeout(feedbackTimer.current);
    }
    feedbackTimer.current = window.setTimeout(() => setRefreshed(false), 2000);
  }

  function selectProject(cwd: string) {
    onCwdChange(cwd);
    setExpandedProjects((current) => {
      const next = new Set(current);
      if (cwd === selectedCwd && next.has(cwd)) next.delete(cwd);
      else next.add(cwd);
      return next;
    });
  }

  return (
    <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex h-8 flex-none items-center gap-1 px-2 text-[11px] font-medium text-muted">
        <span className="flex-1">{t.workspace.projects}</span>
        <CwdPicker onChange={onCwdChange} />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label={t.sessions.refreshSessions}
              onClick={manualRefresh}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              {refreshed ? (
                <Check className="text-success" />
              ) : (
                <RefreshCw />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t.sessions.refreshSessions}</TooltipContent>
        </Tooltip>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {loading ? (
          <div
            aria-label={t.sessions.loadingSessions}
            className="space-y-2 px-2 py-2"
          >
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-[88%]" />
            <Skeleton className="h-14 w-[72%]" />
          </div>
        ) : error ? (
          <div className="p-3 text-[11px] text-destructive">
            <p>{error}</p>
            <Button
              className="mt-2"
              onClick={() => void refresh(true)}
              size="sm"
              variant="outline"
            >
              {t.common.retry}
            </Button>
          </div>
        ) : displayedGroups.length ? (
          <div className="space-y-0.5 py-1">
            {displayedGroups.map((group) => {
              const expanded = expandedProjects.has(group.cwd);
              const selected = group.cwd === selectedCwd;
              return (
                <div key={group.cwd}>
                  <Button
                    aria-expanded={expanded}
                    className="h-8 w-full justify-start gap-1.5 px-2 text-[11px]"
                    onClick={() => selectProject(group.cwd)}
                    title={group.cwd}
                    type="button"
                    variant={selected ? "secondary" : "ghost"}
                  >
                    <ChevronRight
                      className={`size-3 transition-transform ${expanded ? "rotate-90" : ""}`}
                    />
                    <Folder className="size-3.5" />
                    <span className="min-w-0 truncate">
                      {getProjectName(group.cwd)}
                    </span>
                  </Button>
                  {expanded ? (
                    group.nodes.length ? (
                      <div className="ml-3 border-l border-line-subtle pl-1">
                        <SessionTree
                          nodes={group.nodes}
                          onChanged={refresh}
                          onDeleted={onSessionDeleted}
                          onSelect={(session) => {
                            if (session.draft) {
                              onNewSession(session.id, session.cwd);
                            } else {
                              onSelectSession(session);
                            }
                          }}
                          selectedSessionId={selectedSessionId}
                        />
                      </div>
                    ) : (
                      <div className="px-7 py-2 text-[10px] text-dim">
                        {t.sessions.noSessions}
                      </div>
                    )
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 text-center text-[11px] text-dim">
            {t.sessions.noSessions}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
