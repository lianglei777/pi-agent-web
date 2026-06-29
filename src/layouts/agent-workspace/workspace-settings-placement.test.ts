import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const topBarSource = readFileSync(
  fileURLToPath(new URL("./workspace-top-bar.tsx", import.meta.url)),
  "utf8",
);
const workspaceSource = readFileSync(
  fileURLToPath(new URL("./agent-workspace.tsx", import.meta.url)),
  "utf8",
);
const sidebarSource = readFileSync(
  fileURLToPath(new URL("./workspace-sidebar.tsx", import.meta.url)),
  "utf8",
);

describe("workspace composition", () => {
  it("moves Model Provider and Skills into the sidebar", () => {
    expect(sidebarSource).toContain("t.workspace.modelProvider");
    expect(sidebarSource).toContain("t.workspace.skills");
    expect(topBarSource).not.toContain("Cpu");
    expect(topBarSource).not.toContain("Sparkles");
    expect(topBarSource).not.toContain("Moon");
  });

  it("keeps Chat mounted while central pages switch", () => {
    expect(workspaceSource).toContain(
      'activeView === "chat" ? "flex min-h-0 flex-1" : "hidden"',
    );
    expect(workspaceSource).toContain('activeView === "model-provider"');
    expect(workspaceSource).toContain('activeView === "skills"');
    expect(workspaceSource).toContain("<ModelProviderPage");
    expect(workspaceSource).toContain("<SkillsPage");
    expect(workspaceSource).not.toContain("<ModelsConfigDialog");
    expect(workspaceSource).not.toContain("<SkillsConfigDialog");
  });

  it("restores the manual File Workspace only for Chat", () => {
    expect(workspaceSource).toContain(
      'activeView === "chat" && filePanelOpen',
    );
    expect(workspaceSource).toContain("cwd={activeCwd}");
    expect(workspaceSource).toContain("onOpenFile={handleOpenFile}");
    expect(workspaceSource).toContain("refreshKey={explorerRefreshKey}");
  });

  it("uses a desktop-only workspace floor", () => {
    expect(workspaceSource).toContain("min-w-[1024px]");
    expect(workspaceSource).not.toContain("max-[640px]");
  });
});
