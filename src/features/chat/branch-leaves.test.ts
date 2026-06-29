import { describe, expect, it } from "vitest";
import { collectLeaves } from "./branch-leaves";
import type { SessionTreeNode } from "./agent-types";

function node(id: string, children: SessionTreeNode[] = []): SessionTreeNode {
  return {
    entry: {
      id,
      parentId: null,
      type: "message",
      timestamp: "0",
      message: undefined,
    },
    children,
  };
}

describe("collectLeaves", () => {
  it("returns the single leaf when there is one root and no branches", () => {
    const tree = [node("a", [node("b")])];
    expect(collectLeaves(tree).map((n) => n.entry.id)).toEqual(["b"]);
  });

  it("collects every leaf across multiple branches", () => {
    const tree = [
      node("a", [
        node("b", [node("c")]),
        node("d", [node("e"), node("f")]),
      ]),
    ];
    expect(collectLeaves(tree).map((n) => n.entry.id).sort()).toEqual(
      ["c", "e", "f"].sort(),
    );
  });

  it("returns empty for an empty tree", () => {
    expect(collectLeaves([])).toEqual([]);
  });

  it("treats a root with no children as a leaf", () => {
    expect(collectLeaves([node("only")]).map((n) => n.entry.id)).toEqual([
      "only",
    ]);
  });
});
