import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useI18n } from "@/i18n/use-i18n";
import type { WorkspaceView } from "./workspace-navigation";

type WorkspaceTopBarProps = {
  activeView: WorkspaceView;
  filePanelOpen: boolean;
  onToggleFilePanel: () => void;
  onToggleSidebar: () => void;
  projectName: string | null;
  sessionTitle: string | null;
  sidebarOpen: boolean;
};

export function WorkspaceTopBar({
  activeView,
  filePanelOpen,
  onToggleFilePanel,
  onToggleSidebar,
  projectName,
  sessionTitle,
  sidebarOpen,
}: WorkspaceTopBarProps) {
  const { t } = useI18n();
  const title =
    activeView === "model-provider"
      ? t.workspace.modelProvider
      : activeView === "skills"
        ? t.workspace.skills
        : sessionTitle ?? t.workspace.newChat;

  return (
    <header className="flex h-10 flex-none items-center border-b border-line-subtle bg-panel">
      <TopBarIconButton
        label={sidebarOpen ? t.workspace.hideSidebar : t.workspace.showSidebar}
        onClick={onToggleSidebar}
      >
        {sidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
      </TopBarIconButton>

      <div className="min-w-0 flex-1 px-3">
        <div className="truncate text-xs font-medium text-primary">{title}</div>
        {projectName ? (
          <div className="truncate font-ui-mono text-[10px] text-dim">
            {projectName}
          </div>
        ) : null}
      </div>

      {activeView === "chat" && projectName && !filePanelOpen ? (
        <TopBarIconButton
          borderSide="left"
          label={t.workspace.showFilePanel}
          onClick={onToggleFilePanel}
        >
          <PanelRightOpen />
        </TopBarIconButton>
      ) : null}
    </header>
  );
}

function TopBarIconButton({
  borderSide = "right",
  children,
  label,
  onClick,
}: {
  borderSide?: "left" | "right";
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label={label}
          className={`h-full rounded-none ${
            borderSide === "left"
              ? "border-l border-line-subtle"
              : "border-r border-line-subtle"
          } text-muted`}
          onClick={onClick}
          size="icon"
          type="button"
          variant="ghost"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
