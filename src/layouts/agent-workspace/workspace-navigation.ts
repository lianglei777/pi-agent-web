export type WorkspaceView = "chat" | "model-provider" | "skills";

export function shouldConfirmWorkspaceNavigation(
  activeView: WorkspaceView,
  modelProviderDirty: boolean,
) {
  return activeView === "model-provider" && modelProviderDirty;
}
