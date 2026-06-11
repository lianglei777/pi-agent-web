"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Cpu,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChatCenter } from "@/features/chat/chat-center";
import type {
  ContextUsage,
  SessionStats,
  SessionTreeNode,
} from "@/features/chat/agent-types";
import {
  FilePanel,
  type OpenFile,
} from "@/features/files/file-panel";
import { ModelsConfigDialog } from "@/features/models-config/models-config-dialog";
import { SessionSidebar } from "@/features/sessions/session-sidebar";
import { loadSessions } from "@/features/sessions/api";
import type { SessionInfo } from "@/features/sessions/types";
import {
  WorkspaceTopBar,
  type TopPanel,
} from "./workspace-top-bar";

export function AgentWorkspace({
  hasActiveSession = false,
}: {
  hasActiveSession?: boolean;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filePanelOpen, setFilePanelOpen] = useState(false);
  const [topPanel, setTopPanel] = useState<TopPanel>(null);
  const [dark, setDark] = useState(false);
  const [modelsOpen, setModelsOpen] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(hasActiveSession);
  const [selectedSession, setSelectedSession] = useState<SessionInfo | null>(
    null,
  );
  const [activeCwd, setActiveCwd] = useState<string | null>(null);
  const [newSessionCwd, setNewSessionCwd] = useState<string | null>(null);
  const [chatInstanceKey, setChatInstanceKey] = useState(0);
  const [openFile, setOpenFile] = useState<OpenFile | null>(null);
  const [initialSessionId, setInitialSessionId] = useState<
    string | null | undefined
  >(undefined);
  const [sessionRefreshKey, setSessionRefreshKey] = useState(0);
  const [explorerRefreshKey, setExplorerRefreshKey] = useState(0);
  const [branchTree, setBranchTree] = useState<SessionTreeNode[]>([]);
  const [activeLeafId, setActiveLeafId] = useState<string | null>(null);
  const [leafChange, setLeafChange] = useState<
    ((leafId: string) => void) | null
  >(null);
  const [systemPrompt, setSystemPrompt] = useState<string | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [contextUsage, setContextUsage] = useState<ContextUsage | null>(null);
  const sessionIsActive = hasActiveSession || sessionStarted;

  useEffect(() => {
    const themeSync = window.setTimeout(() => {
      const storedTheme = window.localStorage.getItem("pi-theme");
      const shouldUseDark =
        storedTheme === "dark" ||
        (storedTheme === null &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);

      setDark(shouldUseDark);
      document.documentElement.classList.toggle("dark", shouldUseDark);
    }, 0);

    return () => window.clearTimeout(themeSync);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setInitialSessionId(
        new URLSearchParams(window.location.search).get("session"),
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function toggleTheme() {
    const nextDark = !dark;
    setDark(nextDark);
    document.documentElement.classList.toggle("dark", nextDark);
    window.localStorage.setItem("pi-theme", nextDark ? "dark" : "light");
  }

  function toggleTopPanel(panel: Exclude<TopPanel, null>) {
    setTopPanel((current) => (current === panel ? null : panel));
  }

  const updateSessionUrl = useCallback((sessionId: string | null) => {
    const url = new URL(window.location.href);
    if (sessionId) url.searchParams.set("session", sessionId);
    else url.searchParams.delete("session");
    window.history.replaceState(null, "", url);
  }, []);

  const resetChat = useCallback(() => {
    setSessionStarted(false);
    setTopPanel(null);
    setChatInstanceKey((current) => current + 1);
    setBranchTree([]);
    setActiveLeafId(null);
    setLeafChange(null);
    setSystemPrompt(null);
    setSessionStats(null);
    setContextUsage(null);
  }, []);

  const handleCwdChange = useCallback((cwd: string) => {
    setActiveCwd(cwd);
    setOpenFile(null);
    if (selectedSession?.cwd !== cwd) setSelectedSession(null);
    if (newSessionCwd !== cwd) setNewSessionCwd(null);
    updateSessionUrl(null);
    resetChat();
  }, [newSessionCwd, resetChat, selectedSession, updateSessionUrl]);

  const handleSelectSession = useCallback((session: SessionInfo, isRestore = false) => {
    setActiveCwd(session.cwd);
    setSelectedSession(session);
    setNewSessionCwd(null);
    setSessionStarted(true);
    if (!isRestore) updateSessionUrl(session.id);
    setChatInstanceKey((current) => current + 1);
  }, [updateSessionUrl]);

  const handleNewSession = useCallback((_temporaryId: string, cwd: string) => {
    setSelectedSession(null);
    setNewSessionCwd(cwd);
    updateSessionUrl(null);
    resetChat();
  }, [resetChat, updateSessionUrl]);

  const handleSessionDeleted = useCallback((session: SessionInfo) => {
    if (selectedSession?.id !== session.id) return;
    setSelectedSession(null);
    setNewSessionCwd(session.cwd);
    updateSessionUrl(null);
    resetChat();
  }, [resetChat, selectedSession, updateSessionUrl]);

  const selectSessionById = useCallback(async (sessionId: string) => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const sessions = await loadSessions();
      const next = sessions.find((item) => item.id === sessionId);
      if (next) {
        handleSelectSession(next);
        setSessionRefreshKey((current) => current + 1);
        return;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 150));
    }
  }, [handleSelectSession]);

  const handleAgentEnd = useCallback(() => {
    setSessionRefreshKey((current) => current + 1);
    setExplorerRefreshKey((current) => current + 1);
  }, []);

  const handleBranchDataChange = useCallback(
    (
      tree: SessionTreeNode[],
      leafId: string | null,
      changeLeaf: (leafId: string) => void,
    ) => {
      setBranchTree(tree);
      setActiveLeafId(leafId);
      setLeafChange(() => changeLeaf);
    },
    [],
  );

  const handleSessionCreated = useCallback(
    (sessionId: string) => {
      setNewSessionCwd(null);
      setSessionStarted(true);
      void selectSessionById(sessionId);
    },
    [selectSessionById],
  );

  const handleSessionForked = useCallback(
    (sessionId: string) => void selectSessionById(sessionId),
    [selectSessionById],
  );

  return (
    <TooltipProvider>
      <div
        className="flex h-dvh w-screen overflow-hidden bg-canvas"
        data-file-panel-open={filePanelOpen}
        data-sidebar-open={sidebarOpen}
        data-testid="agent-workspace"
      >
        <Button
          aria-label="Close sidebar"
          className={`fixed inset-0 z-199 hidden h-auto cursor-default rounded-none bg-black/40 p-0 hover:bg-black/40 max-[640px]:block ${
            sidebarOpen
              ? "max-[640px]:visible max-[640px]:opacity-100"
              : "max-[640px]:invisible max-[640px]:opacity-0"
          }`}
          onClick={() => setSidebarOpen(false)}
          type="button"
          variant="ghost"
        />

        <aside
          className={`fixed inset-y-0 left-0 z-200 w-[min(280px,85vw)] flex-none overflow-hidden border-r border-line bg-panel shadow-[4px_0_20px_rgba(0,0,0,0.15)] transition-transform duration-250 min-[641px]:relative min-[641px]:inset-auto min-[641px]:shadow-none min-[641px]:transition-[width,border-width] min-[641px]:duration-200 ${
            sidebarOpen
              ? "translate-x-0 min-[641px]:w-[260px] min-[641px]:border-r"
              : "-translate-x-full min-[641px]:w-0 min-[641px]:translate-x-0 min-[641px]:border-r-0"
          }`}
        >
          <div className="flex h-full w-[260px] flex-col max-[640px]:w-[min(280px,85vw)]">
            <SessionSidebar
              explorerRefreshKey={explorerRefreshKey}
              initialSessionId={initialSessionId}
              onAtMention={(path) =>
                window.dispatchEvent(
                  new CustomEvent("pi:mention-file", { detail: path }),
                )
              }
              onCwdChange={handleCwdChange}
              onInitialRestoreDone={() => updateSessionUrl(null)}
              onNewSession={handleNewSession}
              onOpenFile={(path, name) => {
                setOpenFile({ path, name });
                setFilePanelOpen(true);
              }}
              onSelectSession={handleSelectSession}
              onSessionDeleted={handleSessionDeleted}
              selectedCwd={activeCwd}
              selectedSessionId={selectedSession?.id ?? null}
              refreshKey={sessionRefreshKey}
            />
            <Separator />
            <div className="flex gap-1.5 p-2">
              <Button
                className="flex-1"
                onClick={() => setModelsOpen(true)}
                size="sm"
                type="button"
                variant="ghost"
              >
                <Cpu />
                Models
              </Button>
              <Separator orientation="vertical" />
              <Button
                className="flex-1"
                disabled
                size="sm"
                type="button"
                variant="ghost"
              >
                <Sparkles />
                Skills
              </Button>
            </div>
          </div>
        </aside>

        <section
          className={`relative min-w-0 flex-1 flex-col bg-canvas ${
            filePanelOpen ? "hidden min-[641px]:flex" : "flex"
          }`}
        >
          <WorkspaceTopBar
            activeLeafId={activeLeafId}
            branchTree={branchTree}
            contextUsage={contextUsage}
            dark={dark}
            onLeafChange={leafChange}
            onToggleSidebar={() => setSidebarOpen((open) => !open)}
            onToggleTheme={toggleTheme}
            onToggleTopPanel={toggleTopPanel}
            sessionIsActive={sessionIsActive}
            sidebarOpen={sidebarOpen}
            stats={sessionStats}
            systemPrompt={systemPrompt}
            topPanel={topPanel}
          />

          <ChatCenter
            key={chatInstanceKey}
            newSessionCwd={newSessionCwd}
            onAgentEnd={handleAgentEnd}
            onBranchDataChange={handleBranchDataChange}
            onContextUsageChange={setContextUsage}
            onSessionCreated={handleSessionCreated}
            onSessionForked={handleSessionForked}
            onSessionStatsChange={setSessionStats}
            onSystemPromptChange={setSystemPrompt}
            session={selectedSession}
          />
        </section>

        <aside
          className={`flex-none overflow-hidden bg-canvas transition-[width,border-width] duration-200 max-[640px]:border-l-0 ${
            filePanelOpen
              ? "w-full border-l border-line min-[641px]:w-[42%] min-[641px]:min-w-[300px]"
              : "hidden w-0 min-w-0 border-l-0 min-[641px]:block"
          }`}
        >
          <FilePanel file={openFile} />
        </aside>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label={
                filePanelOpen ? "Hide file panel" : "Show file panel"
              }
              aria-pressed={filePanelOpen}
              className={`fixed top-0 right-0 z-300 rounded-none ${
                filePanelOpen ? "bg-selected text-accent" : ""
              }`}
              onClick={() => setFilePanelOpen((open) => !open)}
              size="icon"
              type="button"
              variant="ghost"
            >
              {filePanelOpen ? <PanelRightClose /> : <PanelRightOpen />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {filePanelOpen ? "Hide file panel" : "Show file panel"}
          </TooltipContent>
        </Tooltip>

        {modelsOpen ? (
          <ModelsConfigDialog onClose={() => setModelsOpen(false)} />
        ) : null}
      </div>
    </TooltipProvider>
  );
}
