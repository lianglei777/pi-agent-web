"use client";

import { useEffect, useState } from "react";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChatCenter } from "@/features/chat/chat-center";
import { FilePanel } from "@/features/files/file-panel";
import { ModelsConfigDialog } from "@/features/models-config/models-config-dialog";
import { SessionSidebar } from "@/features/sessions/session-sidebar";
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

  function toggleTheme() {
    const nextDark = !dark;
    setDark(nextDark);
    document.documentElement.classList.toggle("dark", nextDark);
    window.localStorage.setItem("pi-theme", nextDark ? "dark" : "light");
  }

  function toggleTopPanel(panel: Exclude<TopPanel, null>) {
    setTopPanel((current) => (current === panel ? null : panel));
  }

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
          <SessionSidebar onOpenModels={() => setModelsOpen(true)} />
        </aside>

        <section
          className={`relative min-w-0 flex-1 flex-col bg-canvas ${
            filePanelOpen ? "hidden min-[641px]:flex" : "flex"
          }`}
        >
          <WorkspaceTopBar
            dark={dark}
            onToggleSidebar={() => setSidebarOpen((open) => !open)}
            onToggleTheme={toggleTheme}
            onToggleTopPanel={toggleTopPanel}
            sessionIsActive={sessionIsActive}
            sidebarOpen={sidebarOpen}
            topPanel={topPanel}
          />

          <ChatCenter onSessionStart={() => setSessionStarted(true)} />
        </section>

        <aside
          className={`flex-none overflow-hidden bg-canvas transition-[width,border-width] duration-200 max-[640px]:border-l-0 ${
            filePanelOpen
              ? "w-full border-l border-line min-[641px]:w-[42%] min-[641px]:min-w-[300px]"
              : "hidden w-0 min-w-0 border-l-0 min-[641px]:block"
          }`}
        >
          <FilePanel />
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
