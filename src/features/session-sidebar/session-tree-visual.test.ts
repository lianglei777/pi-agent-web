import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const sessionTreeSource = readFileSync(
  fileURLToPath(new URL("./session-tree.tsx", import.meta.url)),
  "utf8",
);
const sessionSidebarSource = readFileSync(
  fileURLToPath(new URL("./session-sidebar.tsx", import.meta.url)),
  "utf8",
);

describe("session tree destructive actions", () => {
  it("uses the shared dialog instead of replacing the session row", () => {
    expect(sessionTreeSource).toContain("<Dialog");
    expect(sessionTreeSource).toContain("<DialogContent");
    expect(sessionTreeSource).toContain("<DialogDescription");
    expect(sessionTreeSource).not.toContain("if (confirming)");
    expect(sessionTreeSource).not.toContain("bg-destructive/8");
  });

  it("keeps row actions stable at narrow sidebar widths", () => {
    // 操作按钮使用绝对定位叠加在文本之上，确保窄 sidebar 也能完整显示
    expect(sessionTreeSource).toContain(
      "absolute right-1 top-1/2 flex -translate-y-1/2 items-center",
    );
    expect(sessionTreeSource).toContain("opacity-0 pointer-events-none");
    expect(sessionTreeSource).toContain("group-hover:opacity-100");
    expect(sessionTreeSource).toContain("group-focus-within:opacity-100");
    expect(sessionTreeSource).not.toContain(
      "hidden items-center group-hover:flex",
    );
    expect(sessionSidebarSource).toContain(
      'viewportClassName="[&>div]:block!"',
    );
  });

  it("defaults focus to cancel and uses explicit deletion copy", () => {
    expect(sessionTreeSource).toContain("t.sessions.deleteSessionTitle");
    expect(sessionTreeSource).toContain("t.sessions.deleteSessionDescription");
    expect(sessionTreeSource).toContain("t.sessions.deleteSessionAction");
    expect(sessionTreeSource).toContain("autoFocus");
  });
});
