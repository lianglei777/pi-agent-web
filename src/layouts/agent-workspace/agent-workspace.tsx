"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ResizeHandle } from "@/components/ui/resize-handle";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChatCenter } from "@/features/chat/chat-center";
import { FilePanel, type OpenFile } from "@/features/file-panel/file-panel";
import { ModelProviderPage } from "@/features/models-config";
import { loadSessions } from "@/features/session-sidebar/api";
import {
  getProjectName,
  getSessionTitle,
} from "@/features/session-sidebar/session-utils";
import type { SessionInfo } from "@/features/session-sidebar/types";
import { SkillsPage } from "@/features/skills-config/skills-page";
import { useI18n } from "@/i18n/use-i18n";
import {
  DEFAULT_FILE_PANEL_WIDTH,
  DEFAULT_SIDEBAR_WIDTH,
  fitPanelWidths,
  getFilePanelWidthBounds,
  getSidebarWidthBounds,
  type PanelWidths,
} from "./panel-sizing";
import {
  shouldConfirmWorkspaceNavigation,
  type WorkspaceView,
} from "./workspace-navigation";
import { WorkspaceSidebar } from "./workspace-sidebar";
import { WorkspaceTopBar } from "./workspace-top-bar";

type DraftSession = {
  id: string;
  cwd: string;
  created: string;
};

export function AgentWorkspace() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filePanelOpen, setFilePanelOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [activeView, setActiveView] = useState<WorkspaceView>("chat");
  const [modelProviderDirty, setModelProviderDirty] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionInfo | null>(null);
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
  const [panelWidths, setPanelWidths] = useState<PanelWidths>({
    filePanel: DEFAULT_FILE_PANEL_WIDTH,
    sidebar: DEFAULT_SIDEBAR_WIDTH,
  });
  const [resizingPanel, setResizingPanel] = useState<
    "filePanel" | "sidebar" | null
  >(null);
  const [workspaceWidth, setWorkspaceWidth] = useState(1280);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const pendingNavigationRef = useRef<(() => void) | null>(null);
  const { t } = useI18n();
  const showFilePanel = activeView === "chat" && filePanelOpen;
  const sidebarBounds = getSidebarWidthBounds(
    workspaceWidth,
    panelWidths.filePanel,
    showFilePanel,
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
          filePanelOpen: showFilePanel,
          sidebarOpen,
        }),
      );
    };
    const observer = new ResizeObserver(fitToWorkspace);
    observer.observe(workspace);

    return () => observer.disconnect();
  }, [showFilePanel, sidebarOpen]);

  function toggleTheme() {
    const nextDark = !dark;
    setDark(nextDark);
    document.documentElement.classList.toggle("dark", nextDark);
    window.localStorage.setItem("pi-theme", nextDark ? "dark" : "light");
  }

  const requestNavigation = useCallback(
    (action: () => void) => {
      if (shouldConfirmWorkspaceNavigation(activeView, modelProviderDirty)) {
        pendingNavigationRef.current = action;
        setConfirmingDiscard(true);
        return;
      }
      action();
    },
    [activeView, modelProviderDirty],
  );

  function cancelDiscard() {
    pendingNavigationRef.current = null;
    setConfirmingDiscard(false);
  }

  function confirmDiscard() {
    const action = pendingNavigationRef.current;
    pendingNavigationRef.current = null;
    setModelProviderDirty(false);
    setConfirmingDiscard(false);
    action?.();
  }

  const updateSessionUrl = useCallback((sessionId: string | null) => {
    const url = new URL(window.location.href);
    if (sessionId) url.searchParams.set("session", sessionId);
    else url.searchParams.delete("session");
    window.history.replaceState(null, "", url);
  }, []);

  const resetChat = useCallback(() => {
    setChatInstanceKey((current) => current + 1);
  }, []);

  const handleCwdChange = useCallback(
    (cwd: string) => {
      setActiveCwd(cwd);
      setOpenFile(null);
      if (selectedSession?.cwd !== cwd) setSelectedSession(null);
      setNewSessionCwd(cwd);
      setDraftSession(null);
      setActiveView("chat");
      updateSessionUrl(null);
      resetChat();
    },
    [resetChat, selectedSession, updateSessionUrl],
  );

  const handleSelectSession = useCallback(
    (session: SessionInfo, isRestore = false) => {
      setActiveCwd(session.cwd);
      setSelectedSession(session);
      setNewSessionCwd(null);
      setDraftSession(null);
      setActiveView("chat");
      if (!isRestore) updateSessionUrl(session.id);
      setChatInstanceKey((current) => current + 1);
    },
    [updateSessionUrl],
  );

  const handleNewSession = useCallback(
    (temporaryId: string, cwd: string) => {
      resetChat();
      setSelectedSession(null);
      setNewSessionCwd(cwd);
      setDraftSession({
        id: temporaryId,
        cwd,
        created: new Date().toISOString(),
      });
      setActiveView("chat");
      updateSessionUrl(null);
    },
    [resetChat, updateSessionUrl],
  );

  const handleSessionDeleted = useCallback(
    (session: SessionInfo) => {
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
    },
    [resetChat, selectedSession, updateSessionUrl],
  );

  const selectSessionById = useCallback(
    async (sessionId: string) => {
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
    },
    [handleSelectSession],
  );

  const handleAgentEnd = useCallback(() => {
    setSessionRefreshKey((current) => current + 1);
    setExplorerRefreshKey((current) => current + 1);
  }, []);

  const handleSessionCreated = useCallback(
    (sessionId: string) => {
      setNewSessionCwd(null);
      setDraftSession(null);
      void selectSessionById(sessionId);
    },
    [selectSessionById],
  );

  const handleSessionForked = useCallback(
    (sessionId: string) => void selectSessionById(sessionId),
    [selectSessionById],
  );

  const handleOpenFile = useCallback((path: string, name: string) => {
    setOpenFile({ path, name });
    setFilePanelOpen(true);
  }, []);

  const handleAtMention = useCallback((path: string) => {
    window.dispatchEvent(
      new CustomEvent("pi:mention-file", { detail: path }),
    );
  }, []);

  return (
    <TooltipProvider>
      <div
        className="flex h-dvh min-w-[1024px] overflow-hidden bg-canvas"
        data-file-panel-open={showFilePanel}
        data-sidebar-open={sidebarOpen}
        data-testid="agent-workspace"
        ref={workspaceRef}
      >
        <aside
          className={`relative flex-none overflow-hidden bg-panel transition-[width,border-width] ${
            resizingPanel === "sidebar"
              ? "duration-0"
              : "duration-[var(--motion-standard)]"
          } ${sidebarOpen ? "w-[var(--panel-width)]" : "w-0"}`}
          style={
            sidebarOpen
              ? ({ "--panel-width": `${panelWidths.sidebar}px` } as CSSProperties)
              : undefined
          }
        >
          <div className="flex h-full w-[var(--panel-width)] flex-col">
            <WorkspaceSidebar
              activeView={activeView}
              dark={dark}
              onNewChat={() => {
                if (!activeCwd) return;
                requestNavigation(() =>
                  handleNewSession(crypto.randomUUID(), activeCwd),
                );
              }}
              onOpenModelProvider={() =>
                requestNavigation(() => setActiveView("model-provider"))
              }
              onOpenSkills={() =>
                requestNavigation(() => setActiveView("skills"))
              }
              onToggleTheme={toggleTheme}
              sessionProps={{
                draftSession,
                initialSessionId,
                onCwdChange: (cwd) =>
                  requestNavigation(() => handleCwdChange(cwd)),
                onInitialRestoreDone: () => updateSessionUrl(null),
                onNewSession: (temporaryId, cwd) =>
                  requestNavigation(() => handleNewSession(temporaryId, cwd)),
                onSelectSession: (session, isRestore) =>
                  requestNavigation(() =>
                    handleSelectSession(session, isRestore),
                  ),
                onSessionDeleted: handleSessionDeleted,
                refreshKey: sessionRefreshKey,
                selectedCwd: activeCwd,
                selectedSessionId:
                  selectedSession?.id ?? draftSession?.id ?? null,
              }}
            />
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

        <section className="relative flex min-w-0 flex-1 flex-col bg-canvas">
          <WorkspaceTopBar
            activeView={activeView}
            filePanelOpen={filePanelOpen}
            onToggleFilePanel={() => setFilePanelOpen((open) => !open)}
            onToggleSidebar={() => setSidebarOpen((open) => !open)}
            projectName={activeCwd ? getProjectName(activeCwd) : null}
            sessionTitle={
              selectedSession ? getSessionTitle(selectedSession) : null
            }
            sidebarOpen={sidebarOpen}
          />

          <div
            className={
              activeView === "chat" ? "flex min-h-0 flex-1" : "hidden"
            }
          >
            <ChatCenter
              key={chatInstanceKey}
              modelsRevision={modelsRevision}
              newSessionCwd={newSessionCwd}
              onAgentEnd={handleAgentEnd}
              onSessionCreated={handleSessionCreated}
              onSessionForked={handleSessionForked}
              session={selectedSession}
            />
          </div>

          {activeView === "model-provider" ? (
            <ModelProviderPage
              onDirtyChange={setModelProviderDirty}
              onSaved={() => setModelsRevision((current) => current + 1)}
            />
          ) : null}
          {activeView === "skills" && activeCwd ? (
            <SkillsPage cwd={activeCwd} />
          ) : null}
        </section>

        {activeView === "chat" && filePanelOpen ? (
          <>
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
            <aside
              className={`flex-none overflow-hidden bg-panel ${
                resizingPanel === "filePanel"
                  ? "duration-0"
                  : "duration-[var(--motion-standard)]"
              } w-[var(--panel-width)]`}
              style={
                {
                  "--panel-width": `${panelWidths.filePanel}px`,
                } as CSSProperties
              }
            >
              <FilePanel
                cwd={activeCwd}
                file={openFile}
                onAtMention={handleAtMention}
                onClose={() => setFilePanelOpen(false)}
                onOpenFile={handleOpenFile}
                refreshKey={explorerRefreshKey}
              />
            </aside>
          </>
        ) : null}

        <Dialog
          onOpenChange={(open) => {
            if (!open) cancelDiscard();
          }}
          open={confirmingDiscard}
        >
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>{t.models.discardChangesTitle}</DialogTitle>
              <DialogDescription>
                {t.models.discardChangesDescription}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button autoFocus onClick={cancelDiscard} variant="outline">
                {t.models.continueEditing}
              </Button>
              <Button onClick={confirmDiscard} variant="destructive">
                {t.models.discardChanges}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
