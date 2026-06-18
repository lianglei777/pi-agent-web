"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  Cpu,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResizeHandle } from "@/components/ui/resize-handle";
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
} from "@/features/file-panel/file-panel";
import { ModelsConfigDialog } from "@/features/models-config";
import { SessionSidebar } from "@/features/session-sidebar/session-sidebar";
import { loadSessions } from "@/features/session-sidebar/api";
import { getSessionTitle } from "@/features/session-sidebar/session-utils";
import type { SessionInfo } from "@/features/session-sidebar/types";
import { SkillsConfigDialog } from "@/features/skills-config/skills-config-dialog";
import { useI18n } from "@/i18n/use-i18n";
import {
  WorkspaceTopBar,
  type TopPanel,
} from "./workspace-top-bar";
import {
  DEFAULT_FILE_PANEL_WIDTH,
  DEFAULT_SIDEBAR_WIDTH,
  fitPanelWidths,
  getFilePanelWidthBounds,
  getSidebarWidthBounds,
  type PanelWidths,
} from "./panel-sizing";

type DraftSession = {
  id: string;
  cwd: string;
  created: string;
};

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
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(hasActiveSession);
  const [selectedSession, setSelectedSession] = useState<SessionInfo | null>(
    null,
  );
  const [activeCwd, setActiveCwd] = useState<string | null>(null);
  const [newSessionCwd, setNewSessionCwd] = useState<string | null>(null);
  const [draftSession, setDraftSession] = useState<DraftSession | null>(null);
  const [chatInstanceKey, setChatInstanceKey] = useState(0);
  const [modelsRevision, setModelsRevision] = useState(0);
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
  const [panelWidths, setPanelWidths] = useState<PanelWidths>({
    filePanel: DEFAULT_FILE_PANEL_WIDTH,
    sidebar: DEFAULT_SIDEBAR_WIDTH,
  });
  const [resizingPanel, setResizingPanel] = useState<
    "filePanel" | "sidebar" | null
  >(null);
  const [workspaceWidth, setWorkspaceWidth] = useState(1280);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const sessionIsActive = hasActiveSession || sessionStarted;
  const { t } = useI18n();
  const sidebarBounds = getSidebarWidthBounds(
    workspaceWidth,
    panelWidths.filePanel,
    filePanelOpen,
  );
  const filePanelBounds = getFilePanelWidthBounds(
    workspaceWidth,
    panelWidths.sidebar,
    sidebarOpen,
  );

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

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;

    const fitToWorkspace = () => {
      setWorkspaceWidth(workspace.clientWidth);
      setPanelWidths((current) =>
        fitPanelWidths(workspace.clientWidth, current, {
          filePanelOpen,
          sidebarOpen,
        }),
      );
    };
    const observer = new ResizeObserver(fitToWorkspace);
    observer.observe(workspace);

    return () => observer.disconnect();
  }, [filePanelOpen, sidebarOpen]);

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
    setSkillsOpen(false);
    setActiveCwd(cwd);
    setOpenFile(null);
    if (selectedSession?.cwd !== cwd) setSelectedSession(null);
    setNewSessionCwd(cwd);
    setDraftSession(null);
    updateSessionUrl(null);
    resetChat();
  }, [resetChat, selectedSession, updateSessionUrl]);

  const handleSelectSession = useCallback((session: SessionInfo, isRestore = false) => {
    setActiveCwd(session.cwd);
    setSelectedSession(session);
    setNewSessionCwd(null);
    setDraftSession(null);
    setSessionStarted(true);
    if (!isRestore) updateSessionUrl(session.id);
    setChatInstanceKey((current) => current + 1);
  }, [updateSessionUrl]);

  const handleNewSession = useCallback((temporaryId: string, cwd: string) => {
    resetChat();
    setSelectedSession(null);
    setNewSessionCwd(cwd);
    setDraftSession({
      id: temporaryId,
      cwd,
      created: new Date().toISOString(),
    });
    updateSessionUrl(null);
  }, [resetChat, updateSessionUrl]);

  const handleSessionDeleted = useCallback((session: SessionInfo) => {
    if (selectedSession?.id !== session.id) return;
    setSelectedSession(null);
    setNewSessionCwd(session.cwd);
    setDraftSession({
      id: crypto.randomUUID(),
      cwd: session.cwd,
      created: new Date().toISOString(),
    });
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
      setDraftSession(null);
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
        ref={workspaceRef}
      >

        {/* Left sidebar */}
        <>
          {/* Mobile: semi-transparent overlay behind the sliding sidebar; tapping it closes the sidebar */}
          <Button
            aria-label={t.workspace.closeSidebar}
            className={`fixed inset-0 z-199 hidden h-auto cursor-default rounded-none bg-black/40 p-0 hover:bg-black/40 max-[640px]:block ${sidebarOpen
                ? "max-[640px]:visible max-[640px]:opacity-100"
                : "max-[640px]:invisible max-[640px]:opacity-0"
              }`}
            onClick={() => setSidebarOpen(false)}
            type="button"
            variant="ghost"
          />

          {/* sidebar content  */}
          <aside
            className={`fixed inset-y-0 left-0 z-200 w-[min(280px,85vw)] flex-none overflow-hidden border-r border-line-subtle bg-canvas shadow-[var(--shadow-floating)] transition-transform duration-[var(--motion-slow)] min-[641px]:relative min-[641px]:inset-auto min-[641px]:shadow-none min-[641px]:transition-[width,border-width] ${resizingPanel === "sidebar" ? "min-[641px]:duration-0" : "min-[641px]:duration-[var(--motion-standard)]"} ${sidebarOpen
                ? "translate-x-0 min-[641px]:w-[var(--panel-width)] min-[641px]:border-r-0"
                : "-translate-x-full min-[641px]:w-0 min-[641px]:translate-x-0 min-[641px]:border-r-0"
              }`}
            style={
              sidebarOpen
                ? {
                    "--panel-width": `${panelWidths.sidebar}px`,
                  } as CSSProperties
                : undefined
            }
          >
            <div className="flex h-full w-full flex-col max-[640px]:w-[min(280px,85vw)]">
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
                draftSession={draftSession}
                selectedCwd={activeCwd}
                selectedSessionId={
                  selectedSession?.id ?? draftSession?.id ?? null
                }
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
                  {t.workspace.models}
                </Button>
                <Separator orientation="vertical" />
                <Button
                  className="flex-1"
                  disabled={!activeCwd}
                  onClick={() => setSkillsOpen(true)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <Sparkles />
                  {t.workspace.skills}
                </Button>
              </div>
            </div>
          </aside>
          {sidebarOpen ? (
            <ResizeHandle
              ariaLabel={t.workspace.resizeSessionSidebar}
              direction={1}
              max={sidebarBounds.max}
              min={sidebarBounds.min}
              onResize={(sidebar) =>
                setPanelWidths((current) => ({ ...current, sidebar }))
              }
              onResizeEnd={() => setResizingPanel(null)}
              onResizeStart={() => setResizingPanel("sidebar")}
              value={panelWidths.sidebar}
            />
          ) : null}
        </>

        {/* Center chat area */}
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
            modelsRevision={modelsRevision}
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



        {/* Right file panel */}
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label={
                  filePanelOpen
                    ? t.workspace.hideFilePanel
                    : t.workspace.showFilePanel
                }
                aria-pressed={filePanelOpen}
                className={`fixed top-0 right-0 z-300 rounded-none ${filePanelOpen ? "bg-selected text-accent" : ""
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
              {filePanelOpen
                ? t.workspace.hideFilePanel
                : t.workspace.showFilePanel}
            </TooltipContent>
          </Tooltip>

          {filePanelOpen ? (
            <ResizeHandle
              ariaLabel={t.workspace.resizeFilePanel}
              direction={-1}
              max={filePanelBounds.max}
              min={filePanelBounds.min}
              onResize={(filePanel) =>
                setPanelWidths((current) => ({ ...current, filePanel }))
              }
              onResizeEnd={() => setResizingPanel(null)}
              onResizeStart={() => setResizingPanel("filePanel")}
              value={panelWidths.filePanel}
            />
          ) : null}

          <aside
            className={`flex-none overflow-hidden bg-canvas transition-[width] ${resizingPanel === "filePanel" ? "duration-0" : "duration-[var(--motion-standard)]"} ${filePanelOpen
              ? "w-full min-[641px]:w-[var(--panel-width)]"
              : "hidden w-0 min-w-0 min-[641px]:block"
              }`}
            style={
              filePanelOpen
                ? {
                    "--panel-width": `${panelWidths.filePanel}px`,
                  } as CSSProperties
                : undefined
            }
          >
            <FilePanel file={openFile} />
          </aside>


        </>


        {/* Model Config  dialog*/}
        {modelsOpen ? (
          <ModelsConfigDialog
            onClose={() => setModelsOpen(false)}
            onSaved={() => setModelsRevision((current) => current + 1)}
          />
        ) : null}
        {skillsOpen && activeCwd ? (
          <SkillsConfigDialog
            cwd={activeCwd}
            onClose={() => setSkillsOpen(false)}
          />
        ) : null}
      </div>
    </TooltipProvider>
  );
}
