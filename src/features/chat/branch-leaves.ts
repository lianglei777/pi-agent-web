import type { SessionTreeNode } from "./agent-types";

// 收集会话分支树中的所有叶子节点(无子节点),作为可导航的分支端点。
export function collectLeaves(nodes: SessionTreeNode[]): SessionTreeNode[] {
  const leaves: SessionTreeNode[] = [];
  const walk = (node: SessionTreeNode) => {
    if (node.children.length === 0) {
      leaves.push(node);
      return;
    }
    node.children.forEach(walk);
  };
  nodes.forEach(walk);
  return leaves;
}
