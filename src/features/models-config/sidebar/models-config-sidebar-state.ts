import type { Selection } from "../types";

export function getSelectionKey(selection: Selection | null) {
  if (!selection) return null;
  if (selection.type === "provider") return `provider:${selection.name}`;
  if (selection.type === "model") {
    return `model:${selection.providerName}:${selection.index}`;
  }
  return `${selection.type}:${selection.providerId}`;
}

export function getSelectionProviderName(selection: Selection | null) {
  if (!selection) return null;
  if (selection.type === "provider") return selection.name;
  if (selection.type === "model") return selection.providerName;
  return null;
}

export function isProviderCollapsed(
  collapsedProviderNames: ReadonlySet<string>,
  providerName: string,
  selection: Selection | null,
) {
  if (selection?.type === "model" && selection.providerName === providerName) {
    return false;
  }
  return collapsedProviderNames.has(providerName);
}
