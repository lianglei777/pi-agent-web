import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const root = fileURLToPath(new URL("../../", import.meta.url));
const css = readFileSync(`${root}/src/app/globals.css`, "utf8");
const layout = readFileSync(`${root}/src/app/layout.tsx`, "utf8");
const chatCenter = readFileSync(
  `${root}/src/features/chat/chat-center.tsx`,
  "utf8",
);
const chatInput = readFileSync(
  `${root}/src/features/chat/chat-input.tsx`,
  "utf8",
);
const messageView = readFileSync(
  `${root}/src/features/chat/message-view.tsx`,
  "utf8",
);
const topBar = readFileSync(
  `${root}/src/layouts/agent-workspace/workspace-top-bar.tsx`,
  "utf8",
);
const agentWorkspace = readFileSync(
  `${root}/src/layouts/agent-workspace/agent-workspace.tsx`,
  "utf8",
);

describe("visual foundation contract", () => {
  test("defines the approved Adaptive Workbench and Deep Focus tokens", () => {
    expect(css).toContain("--bg: #f1f3f2");
    expect(css).toContain("--bg-panel: #f8f9f8");
    expect(css).toContain("--bg-elevated: #fbfcfb");
    expect(css).toContain("--bg-selected: #e2e9e5");
    expect(css).toContain("--text: #151816");
    expect(css).toContain("--text-muted: #53605b");
    expect(css).toContain("--border-subtle: #d8ddda");
    expect(css).toContain("--border-strong: #aab3ae");
    expect(css).toContain("--accent: #17624b");
    expect(css).toContain("--primary-foreground: #ffffff");

    expect(css).toContain("--bg: #121514");
    expect(css).toContain("--bg-panel: #181b1a");
    expect(css).toContain("--bg-elevated: #1f2421");
    expect(css).toContain("--bg-selected: #26312c");
    expect(css).toContain("--text: #eef1ed");
    expect(css).toContain("--text-muted: #a8b0aa");
    expect(css).toContain("--border-subtle: #2d332f");
    expect(css).toContain("--border-strong: #57625c");
    expect(css).toContain("--accent: #8bc7b0");
    expect(css).toContain("--primary-foreground: #102019");
  });

  test("registers approved display fonts without replacing the UI font", () => {
    expect(layout).toContain("Playfair_Display");
    expect(layout).toContain("Noto_Serif_SC");
    expect(layout).toContain("--font-display-latin");
    expect(layout).toContain("--font-display-cjk");
    expect(css).toContain("--font-display:");
  });

  test("defines reduced-motion fallback and shared motion durations", () => {
    expect(css).toContain("--motion-fast: 150ms");
    expect(css).toContain("--motion-standard: 200ms");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("animation-duration: 0.01ms");
  });

  test("applies the visual foundation to the chat sample", () => {
    expect(chatCenter).toContain("text-display");
    expect(topBar).toContain("font-ui-mono");
    expect(chatInput).not.toContain("rounded-[20px]");
    expect(chatInput).not.toContain("linear-gradient");
    expect(chatInput).toContain("rounded-lg");
    expect(messageView).toContain("border-line-subtle");
  });

  test("uses one continuous canvas with locally elevated controls", () => {
    expect(agentWorkspace).toContain("border-line-subtle bg-canvas");
    expect(topBar).toContain("border-line-strong bg-canvas");
    expect(chatInput).not.toContain("rounded-[14px]");
    expect(chatInput).not.toContain("shadow-[var(--shadow-composer)]");
  });
});
