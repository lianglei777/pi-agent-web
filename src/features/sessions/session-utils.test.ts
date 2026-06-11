import { describe, expect, it } from "vitest";
import {
  buildSessionTree,
  getRecentCwds,
  joinPath,
  relativePath,
  shortenCwd,
} from "./session-utils";
import type { SessionInfo } from "./types";

function session(
  id: string,
  modified: string,
  parentSessionId?: string,
  cwd = "C:\\work",
): SessionInfo {
  return {
    id,
    path: id,
    cwd,
    created: modified,
    modified,
    messageCount: 1,
    firstMessage: id,
    parentSessionId,
  };
}

describe("session sidebar utilities", () => {
  it("returns recent directories once and in activity order", () => {
    expect(
      getRecentCwds([
        session("a", "2026-01-01", undefined, "A"),
        session("b", "2026-01-03", undefined, "B"),
        session("c", "2026-01-04", undefined, "A"),
      ]),
    ).toEqual(["A", "B"]);
  });

  it("builds and sorts a session tree", () => {
    const tree = buildSessionTree([
      session("root", "2026-01-01"),
      session("child", "2026-01-03", "root"),
      session("new-root", "2026-01-04"),
    ]);
    expect(tree.map((node) => node.session.id)).toEqual(["new-root", "root"]);
    expect(tree[1]?.children[0]?.session.id).toBe("child");
  });

  it("terminates cyclic parent links as roots", () => {
    const tree = buildSessionTree([
      session("a", "2026-01-01", "b"),
      session("b", "2026-01-02", "a"),
    ]);
    expect(tree).toHaveLength(2);
  });

  it("formats Windows and POSIX paths", () => {
    expect(shortenCwd("C:\\Users\\me\\work\\app", "C:\\Users\\me")).toBe(
      "~/.../work/app",
    );
    expect(joinPath("/work/app", "src")).toBe("/work/app/src");
    expect(relativePath("C:\\work\\app", "C:\\work\\app\\src\\x.ts")).toBe(
      "src/x.ts",
    );
  });
});
