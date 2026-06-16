"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { loadHome, loadSessions } from "./api";
import { CwdPicker } from "./cwd-picker";
import { FileExplorer } from "./file-explorer";
import {
  buildSessionTree,
  getRecentCwds,
} from "./session-utils";
import { SessionTree } from "./session-tree";
import type { SessionInfo } from "./types";

export type SessionSidebarProps = {
  selectedSessionId: string | null;
  selectedCwd: string | null;
  initialSessionId?: string | null;
  refreshKey?: number;
  explorerRefreshKey?: number;
  onSelectSession: (session: SessionInfo, isRestore?: boolean) => void;
  onNewSession: (temporaryId: string, cwd: string) => void;
  onSessionDeleted: (session: SessionInfo) => void;
  onCwdChange: (cwd: string) => void;
  onInitialRestoreDone?: () => void;
  onOpenFile?: (path: string, name: string) => void;
  onAtMention?: (path: string) => void;
};

export function SessionSidebar({
  selectedSessionId,
  selectedCwd,
  initialSessionId,
  refreshKey = 0,
  explorerRefreshKey = 0,
  onSelectSession,
  onNewSession,
  onSessionDeleted,
  onCwdChange,
  onInitialRestoreDone,
  onOpenFile,
  onAtMention,
}: SessionSidebarProps) {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [home, setHome] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshed, setRefreshed] = useState(false);
  const restoreAttempted = useRef(false);
  const feedbackTimer = useRef<number | null>(null);

  const refresh = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      setSessions(await loadSessions());
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load sessions");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void Promise.all([
        refresh(true),
        loadHome()
          .then(({ home: value }) => setHome(value))
          .catch(() => undefined),
      ]);
    }, 0);
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

  const recentCwds = useMemo(() => getRecentCwds(sessions), [sessions]);
  const visibleSessions = useMemo(
    () => sessions.filter((session) => session.cwd === selectedCwd),
    [selectedCwd, sessions],
  );
  const tree = useMemo(
    () => buildSessionTree(visibleSessions),
    [visibleSessions],
  );

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
    if (!selectedCwd && recentCwds[0]) onCwdChange(recentCwds[0]);
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

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-1.5 px-2.5 pt-3 pb-2.5">
        <div className="min-w-0 flex-1 overflow-hidden font-ui-mono text-[15px] font-semibold whitespace-nowrap text-primary">
          Pi Agent Web
        </div>
        <Button
          className="w-[65px]"
          disabled={!selectedCwd}
          onClick={() =>
            selectedCwd && onNewSession(crypto.randomUUID(), selectedCwd)
          }
          size="sm"
          type="button"
        >
          <Plus />
          New
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label="Refresh sessions"
              onClick={manualRefresh}
              size="icon-sm"
              type="button"
              variant="outline"
            >
              {refreshed ? (
                <Check className="text-green-600" />
              ) : (
                <RefreshCw />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh sessions</TooltipContent>
        </Tooltip>
      </div>

      <CwdPicker
        cwd={selectedCwd}
        home={home}
        onChange={onCwdChange}
        recentCwds={recentCwds}
      />

      <Separator />
      <ScrollArea
        className={selectedCwd ? "min-h-20 flex-1" : "min-h-20 flex-[1_1_100%]"}
      >
        {loading ? (
          <div className="space-y-2 px-3 py-3.5" aria-label="Loading sessions">
            <Skeleton className="h-[54px] w-full" />
            <Skeleton className="h-[54px] w-[88%]" />
            <Skeleton className="h-[54px] w-[72%]" />
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
              Retry
            </Button>
          </div>
        ) : !selectedCwd ? (
          <div className="p-4 text-center text-[11px] text-dim">
            Select a project to view sessions
          </div>
        ) : tree.length ? (
          <div className="py-1">
            <SessionTree
              nodes={tree}
              onChanged={refresh}
              onDeleted={onSessionDeleted}
              onSelect={onSelectSession}
              selectedSessionId={selectedSessionId}
            />
          </div>
        ) : (
          <div className="p-4 text-center text-[11px] text-dim">
            No sessions found
          </div>
        )}
      </ScrollArea>

      {selectedCwd ? (
        <FileExplorer
          cwd={selectedCwd}
          key={selectedCwd}
          onAtMention={onAtMention}
          onOpenFile={onOpenFile}
          refreshKey={explorerRefreshKey}
        />
      ) : null}

    </div>
  );
}
