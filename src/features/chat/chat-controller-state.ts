import type { ModelInfo } from "./agent-types";

export type LoadedModelData = {
  models: ModelInfo[];
  defaultModel: { provider: string; modelId: string } | null;
};

export function resolveLoadedModelState(
  currentModelKey: string,
  data: LoadedModelData,
) {
  return {
    models: data.models,
    modelKey: currentModelKey || defaultModelKey(data),
  };
}

export type SubmitMode = "prompt" | "steer" | "follow_up";

export type SubmitTarget =
  | { type: "new"; cwd: string }
  | { type: "existing"; sessionId: string }
  | { type: "blocked"; reason: "NO_SESSION_TARGET" };

export function resolveSubmitTarget({
  isNew,
  mode,
  newSessionCwd,
  sessionId,
}: {
  isNew: boolean;
  mode: SubmitMode;
  newSessionCwd: string | null;
  sessionId: string | null;
}): SubmitTarget {
  if (isNew && mode === "prompt" && newSessionCwd) {
    return { type: "new", cwd: newSessionCwd };
  }
  if (sessionId) return { type: "existing", sessionId };
  return { type: "blocked", reason: "NO_SESSION_TARGET" };
}

function defaultModelKey(data: LoadedModelData) {
  if (data.defaultModel) {
    return `${data.defaultModel.provider}:${data.defaultModel.modelId}`;
  }
  const first = data.models[0];
  return first ? `${first.provider}:${first.id}` : "";
}
