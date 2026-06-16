import {
  GitBranch,
  Languages,
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
import type {
  ContextUsage,
  SessionStats,
  SessionTreeNode,
} from "@/features/chat/agent-types";
import { localeLabel } from "@/i18n/locales";
import { useI18n } from "@/i18n/use-i18n";

export type TopPanel = "branches" | "system" | null;

type WorkspaceTopBarProps = {
  dark: boolean;
  sessionIsActive: boolean;
  sidebarOpen: boolean;
  topPanel: TopPanel;
  onToggleSidebar: () => void;
  onToggleTheme: () => void;
  onToggleTopPanel: (panel: Exclude<TopPanel, null>) => void;
  branchTree: SessionTreeNode[];
  activeLeafId: string | null;
  onLeafChange: ((leafId: string) => void) | null;
  systemPrompt: string | null;
  stats: SessionStats | null;
  contextUsage: ContextUsage | null;
};

export function WorkspaceTopBar({
  dark,
  sessionIsActive,
  sidebarOpen,
  topPanel,
  onToggleSidebar,
  onToggleTheme,
  onToggleTopPanel,
  branchTree,
  activeLeafId,
  onLeafChange,
  systemPrompt,
  stats,
  contextUsage,
}: WorkspaceTopBarProps) {
  const { locale, setLocale, t } = useI18n();
  const nextLocale = locale === "zh" ? "en" : "zh";

  return (
    <>
      <header className="flex h-9 flex-none items-stretch border-b border-line bg-panel pr-12">

        {/* Left session sidebar toggle */}
        <TopBarIconButton
          label={sidebarOpen ? t.workspace.hideSidebar : t.workspace.showSidebar}
          onClick={onToggleSidebar}
          pressed={sidebarOpen}
        >
          {sidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
        </TopBarIconButton>

        {/* color theme */}
        <TopBarIconButton
          label={dark ? t.workspace.useLightTheme : t.workspace.useDarkTheme}
          onClick={onToggleTheme}
          pressed={dark}
        >
          {dark ? <Sun /> : <Moon />}
        </TopBarIconButton>

        <TopBarIconButton
          label={
            nextLocale === "zh"
              ? t.common.switchToChinese
              : t.common.switchToEnglish
          }
          onClick={() => setLocale(nextLocale)}
          pressed={false}
        >
          <Languages />
          <span className="sr-only">{t.common.language}</span>
        </TopBarIconButton>
        <span className="flex items-center border-r border-line px-2 font-ui-mono text-[10px] text-dim">
          {localeLabel(locale)}
        </span>

        {/* {sessionIsActive ? (
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
        ) : null} */}
        <div className="flex-1" />

        {/* input + output token / cost */}
        {stats ? (
          <div className="flex items-center px-2 font-ui-mono text-xs text-dim">
            {stats.input + stats.output} tokens / ${stats.cost.toFixed(4)}
          </div>
        ) : null}
        {contextUsage ? (
          <div className="flex items-center px-2 font-ui-mono text-xs text-dim">
            {t.workspace.context}{" "}
            {contextUsage.percent === null
              ? "n/a"
              : `${contextUsage.percent.toFixed(0)}%`}
          </div>
        ) : null}
      </header>

      {topPanel ? (
        <section
          className="absolute top-9 left-0 z-500 max-h-[45vh] min-h-24 w-full overflow-auto border-b border-line bg-panel p-3 text-xs text-muted shadow-[0_6px_20px_rgba(0,0,0,0.1)]"
          data-testid="top-panel"
        >
          {topPanel === "branches" ? (
            branchTree.length ? (
              <BranchNodes
                activeLeafId={activeLeafId}
                nodes={branchTree}
                onLeafChange={onLeafChange}
              />
            ) : (
              t.workspace.noBranches
            )
          ) : systemPrompt ? (
            <pre className="m-0 font-ui-mono text-[11px] leading-5 whitespace-pre-wrap">
              {systemPrompt}
            </pre>
          ) : (
            t.workspace.noSystemPrompt
          )}
        </section>
      ) : null}
    </>
  );
}

function BranchNodes({
  nodes,
  activeLeafId,
  onLeafChange,
  depth = 0,
}: {
  nodes: SessionTreeNode[];
  activeLeafId: string | null;
  onLeafChange: ((leafId: string) => void) | null;
  depth?: number;
}) {
  return nodes.map((node) => {
    const label =
      node.label ??
      node.entry.message?.role ??
      node.entry.type;
    return (
      <div key={node.entry.id}>
        <Button
          className={`h-7 justify-start px-2 text-[11px] ${
            activeLeafId === node.entry.id ? "bg-selected text-primary" : ""
          }`}
          disabled={!onLeafChange}
          onClick={() => onLeafChange?.(node.entry.id)}
          style={{ marginLeft: `${depth * 12}px` }}
          variant="ghost"
        >
          <GitBranch className="size-3" />
          <span className="max-w-[620px] truncate">{label}</span>
        </Button>
        {node.children.length ? (
          <BranchNodes
            activeLeafId={activeLeafId}
            depth={depth + 1}
            nodes={node.children}
            onLeafChange={onLeafChange}
          />
        ) : null}
      </div>
    );
  });
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
