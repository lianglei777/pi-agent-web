import { describe, expect, it } from "vitest";
import {
  buildSessionTree,
  getProjectName,
  groupSessionsByProject,
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

  it("keeps registered projects without Sessions and filters unregistered Sessions", () => {
    const groups = groupSessionsByProject(
      [
        { path: "C:\\work\\alpha", aliases: ["C:\\work\\alpha"] },
        { path: "C:\\work\\empty", aliases: ["C:\\work\\empty"] },
      ],
      [
        session("alpha", "2026-01-03", undefined, "C:\\work\\alpha"),
        session("hidden", "2026-01-04", undefined, "C:\\work\\removed"),
      ],
    );

    expect(groups.map((group) => group.cwd)).toEqual([
      "C:\\work\\alpha",
      "C:\\work\\empty",
    ]);
    expect(groups[0]?.nodes[0]?.session.id).toBe("alpha");
    expect(groups[1]?.nodes).toEqual([]);
  });

  it("groups historical Session path aliases under the canonical project", () => {
    const groups = groupSessionsByProject(
      [
        {
          path: "C:\\work\\alpha",
          aliases: ["C:\\work\\alpha", "C:\\WORK\\ALPHA"],
        },
      ],
      [session("legacy", "2026-01-03", undefined, "C:\\WORK\\ALPHA")],
    );

    expect(groups[0]?.nodes[0]?.session.id).toBe("legacy");
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
