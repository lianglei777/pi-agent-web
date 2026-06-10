import {
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type TopPanel = "branches" | "system" | null;

type WorkspaceTopBarProps = {
  dark: boolean;
  sessionIsActive: boolean;
  sidebarOpen: boolean;
  topPanel: TopPanel;
  onToggleSidebar: () => void;
  onToggleTheme: () => void;
  onToggleTopPanel: (panel: Exclude<TopPanel, null>) => void;
};

export function WorkspaceTopBar({
  dark,
  sessionIsActive,
  sidebarOpen,
  topPanel,
  onToggleSidebar,
  onToggleTheme,
  onToggleTopPanel,
}: WorkspaceTopBarProps) {
  return (
    <>
      <header className="flex h-9 flex-none items-stretch border-b border-line bg-panel pr-12">
        <TopBarIconButton
          label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          onClick={onToggleSidebar}
          pressed={sidebarOpen}
        >
          {sidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
        </TopBarIconButton>
        <TopBarIconButton
          label={dark ? "Use light theme" : "Use dark theme"}
          onClick={onToggleTheme}
          pressed={dark}
        >
          {dark ? <Sun /> : <Moon />}
        </TopBarIconButton>
        {sessionIsActive ? (
          <>
            <Separator
              className="mx-1 h-[18px] self-center"
              orientation="vertical"
            />
            <TopPanelButton
              active={topPanel === "branches"}
              label="Branches"
              onClick={() => onToggleTopPanel("branches")}
            />
            <TopPanelButton
              active={topPanel === "system"}
              label="System"
              onClick={() => onToggleTopPanel("system")}
            />
          </>
        ) : null}
        <div className="flex-1" />
      </header>

      {topPanel ? (
        <section
          className="absolute top-9 left-0 z-500 flex min-h-24 w-full items-center justify-center border-b border-line bg-panel text-xs text-dim shadow-[0_6px_20px_rgba(0,0,0,0.1)]"
          data-testid="top-panel"
        >
          <span>
            {topPanel === "branches"
              ? "No branches in this session"
              : "No system prompt available"}
          </span>
        </section>
      ) : null}
    </>
  );
}

function TopPanelButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      aria-expanded={active}
      className={`relative h-9 cursor-pointer border-t-2 px-2.5 text-[11px] ${
        active
          ? "border-accent bg-selected text-primary"
          : "border-transparent bg-transparent text-muted hover:bg-hover hover:text-primary"
      }`}
      onClick={onClick}
      size="sm"
      type="button"
      variant="ghost"
    >
      {label}
    </Button>
  );
}

function TopBarIconButton({
  children,
  label,
  onClick,
  pressed,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  pressed: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label={label}
          aria-pressed={pressed}
          className="rounded-none border-r border-line"
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
