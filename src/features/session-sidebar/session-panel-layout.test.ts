import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  getSessionPanelBounds,
  resolveSessionPanelHeight,
} from "./session-panel-layout";

const sidebarSource = readFileSync(
  fileURLToPath(new URL("./session-sidebar.tsx", import.meta.url)),
  "utf8",
);
const fileExplorerSource = readFileSync(
  fileURLToPath(new URL("./file-explorer.tsx", import.meta.url)),
  "utf8",
);
const cwdPickerSource = readFileSync(
  fileURLToPath(new URL("./cwd-picker.tsx", import.meta.url)),
  "utf8",
);
const sessionTreeSource = readFileSync(
  fileURLToPath(new URL("./session-tree.tsx", import.meta.url)),
  "utf8",
);

describe("session panel layout", () => {
  it("initializes the session panel to 60 percent within valid bounds", () => {
    expect(resolveSessionPanelHeight(null, 500)).toBe(300);
  });

  it("clamps an existing height when the available region shrinks", () => {
    expect(resolveSessionPanelHeight(360, 400)).toBe(279);
  });

  it("clamps values to the normal minimum and maximum", () => {
    expect(resolveSessionPanelHeight(20, 500)).toBe(80);
    expect(resolveSessionPanelHeight(450, 500)).toBe(379);
  });

  it("keeps bounds valid for an exceptionally short container", () => {
    expect(getSessionPanelBounds(100)).toEqual({ min: 0, max: 0 });
    expect(resolveSessionPanelHeight(null, 100)).toBe(0);
  });

  it("keeps the split transient and clamps it from ResizeObserver measurements", () => {
    expect(sidebarSource).toContain("new ResizeObserver(sync)");
    expect(sidebarSource).toContain(
      "resolveSessionPanelHeight(current, height)",
    );
    expect(sidebarSource).not.toContain("localStorage");
    expect(sidebarSource).not.toContain("sessionStorage");
  });

  it("uses one expanded split boundary and keeps project-picker spacing", () => {
    expect(fileExplorerSource).toContain(
      'open ? "" : "border-t border-line-strong"',
    );
    expect(cwdPickerSource).toContain(
      'className="relative mx-2.5 my-2"',
    );
  });

  it("uses a quiet section hierarchy and semantic selected rows", () => {
    expect(sidebarSource).toContain("bg-panel");
    expect(sidebarSource).toContain("text-[11px] font-medium text-muted");
    expect(fileExplorerSource).toContain("focus-within:bg-selected");
    expect(fileExplorerSource).not.toContain("uppercase");
    expect(cwdPickerSource).toContain("border-line-strong");
    expect(sessionTreeSource).toContain("focus-within:border-line-strong");
    expect(sessionTreeSource).toContain("bg-selected");
    expect(sessionTreeSource).toContain("text-accent");
  });
});
