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

// 优先使用用户设置的分支名称,否则提取叶子消息首行作为摘要。
export function leafSummary(node: SessionTreeNode): string {
  if (node.label) return node.label;
  const fallback = node.entry.id.slice(0, 8);
  const message = node.entry.message;
  if (!message || typeof message !== "object" || !("content" in message)) {
    return fallback;
  }
  const content = message.content;
  const text =
    typeof content === "string"
      ? content
      : Array.isArray(content)
        ? content
            .map((block) => (block.type === "text" ? block.text : ""))
            .filter(Boolean)
            .join(" ")
        : "";
  return (text.split(/\r?\n/, 1)[0] ?? "").slice(0, 60) || fallback;
}
