"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Check, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResizeHandle } from "@/components/ui/resize-handle";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useI18n } from "@/i18n/use-i18n";
import { loadDefaultCwd, loadHome, loadSessions } from "./api";
import { CwdPicker } from "./cwd-picker";
import { FileExplorer } from "./file-explorer";
import { createDraftSession } from "./session-draft";
import {
  getSessionPanelBounds,
  resolveSessionPanelHeight,
} from "./session-panel-layout";
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
  draftSession?: { id: string; cwd: string; created: string } | null;
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
  draftSession,
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
  const { t } = useI18n();

  // 会话区与文件浏览器之间可拖拽的纵向分隔。
  const [fileExplorerOpen, setFileExplorerOpen] = useState(true);
  const [sessionPanelHeight, setSessionPanelHeight] = useState<number | null>(
    null,
  );
  const flexRegionRef = useRef<HTMLDivElement>(null);
  const [flexRegionHeight, setFlexRegionHeight] = useState(0);

  // 测量弹性区域高度，并将会话区高度约束在当前可用范围内。
  useEffect(() => {
    const el = flexRegionRef.current;
    if (!el) return;
    const sync = () => {
      const height = el.clientHeight;
      setFlexRegionHeight(height);
      setSessionPanelHeight((current) =>
        resolveSessionPanelHeight(current, height),
      );
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const sessionBounds = useMemo(
    () => getSessionPanelBounds(flexRegionHeight),
    [flexRegionHeight],
  );

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
  const visibleSessions = useMemo(() => {
    const matching = sessions.filter((session) => session.cwd === selectedCwd);
    if (!selectedCwd || draftSession?.cwd !== selectedCwd) return matching;
    return [
      ...matching,
      createDraftSession({
        temporaryId: draftSession.id,
        cwd: draftSession.cwd,
        label: t.sessions.draft,
        now: draftSession.created,
      }),
    ];
  }, [draftSession, selectedCwd, sessions, t.sessions.draft]);
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

  const showSplitHandle =
    Boolean(selectedCwd) && fileExplorerOpen && sessionPanelHeight !== null;
  const sessionRegionStyle: CSSProperties = showSplitHandle
    ? { height: sessionPanelHeight as number, flex: "none" }
    : { flex: 1 };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <CwdPicker
        cwd={selectedCwd}
        home={home}
        onChange={onCwdChange}
        recentCwds={recentCwds}
      />

      <Separator />

      <div className="flex min-h-0 flex-1 flex-col" ref={flexRegionRef}>
        <div className="flex min-h-0 flex-col" style={sessionRegionStyle}>
          <div className="flex items-center gap-1 px-2.5 pt-2 pb-1.5 border-b border-line-subtle">
            <span className="flex-1 text-xs font-semibold text-muted">
              {t.sessions.title}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label={t.sessions.new}
                  disabled={!selectedCwd}
                  onClick={() =>
                    selectedCwd && onNewSession(crypto.randomUUID(), selectedCwd)
                  }
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <Plus />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t.sessions.new}</TooltipContent>
            </Tooltip>
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
          <ScrollArea className="min-h-20 flex-1">
            {loading ? (
              <div
                className="space-y-2 px-3 py-3.5"
                aria-label={t.sessions.loadingSessions}
              >
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
                  {t.common.retry}
                </Button>
              </div>
            ) : !selectedCwd ? (
              <div className="p-4 text-center text-[11px] text-dim">
                {t.sessions.selectProjectToViewSessions}
              </div>
            ) : tree.length ? (
              <div className="py-1">
                <SessionTree
                  nodes={tree}
                  onChanged={refresh}
                  onDeleted={onSessionDeleted}
                  onSelect={(session) => {
                    if (session.draft) onNewSession(session.id, session.cwd);
                    else onSelectSession(session);
                  }}
                  selectedSessionId={selectedSessionId}
                />
              </div>
            ) : (
              <div className="p-4 text-center text-[11px] text-dim">
                {t.sessions.noSessions}
              </div>
            )}
          </ScrollArea>
        </div>

        {showSplitHandle ? (
          <ResizeHandle
            ariaLabel={t.sessions.resizeExplorer}
            axis="y"
            direction={1}
            max={sessionBounds.max}
            min={sessionBounds.min}
            onResize={setSessionPanelHeight}
            value={sessionPanelHeight ?? 0}
          />
        ) : null}

        {selectedCwd ? (
          <FileExplorer
            cwd={selectedCwd}
            key={selectedCwd}
            onAtMention={onAtMention}
            onOpenChange={setFileExplorerOpen}
            onOpenFile={onOpenFile}
            open={fileExplorerOpen}
            refreshKey={explorerRefreshKey}
          />
        ) : null}
      </div>
    </div>
  );
}
