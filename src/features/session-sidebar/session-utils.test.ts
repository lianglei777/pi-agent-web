import { describe, expect, it } from "vitest";
import {
  buildSessionTree,
  getProjectName,
  getRecentCwds,
  groupSessionsByCwd,
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

  it("groups every project and builds its session tree", () => {
    const groups = groupSessionsByCwd([
      session("a", "2026-01-03", undefined, "C:\\work\\alpha"),
      session("b", "2026-01-02", undefined, "C:\\work\\beta"),
      session("a-child", "2026-01-01", "a", "C:\\work\\alpha"),
    ]);

    expect(groups.map((group) => group.cwd)).toEqual([
      "C:\\work\\alpha",
      "C:\\work\\beta",
    ]);
    expect(groups[0]?.nodes[0]?.session.id).toBe("a");
    expect(groups[0]?.nodes[0]?.children[0]?.session.id).toBe("a-child");
  });

  it("does not cap the project sidebar to five entries", () => {
    const sessions = Array.from({ length: 6 }, (_, index) =>
      session(
        `session-${index}`,
        `2026-01-0${index + 1}`,
        undefined,
        `C:\\work\\project-${index}`,
      ),
    );

    expect(groupSessionsByCwd(sessions)).toHaveLength(6);
  });

  it("uses the final path segment as the project name", () => {
    expect(getProjectName("C:\\work\\po-agent-web")).toBe("po-agent-web");
    expect(getProjectName("/work/po-agent-web/")).toBe("po-agent-web");
  });

  it("shortens a project path relative to home", () => {
    expect(shortenCwd("C:\\Users\\me\\work\\app", "C:\\Users\\me")).toBe(
      "~/.../work/app",
    );
  });
});
