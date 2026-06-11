import type {
  AgentCommand,
  ModelInfo,
  RuntimeState,
  SessionDetail,
  ThinkingLevel,
} from "./agent-types";

type ApiError = { error?: { message?: string } };

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = (await response.json()) as T & ApiError;
  if (!response.ok) {
    throw new Error(data.error?.message ?? `Request failed (${response.status})`);
  }
  return data;
}

export function loadSession(id: string) {
  return requestJson<SessionDetail>(
    `/api/sessions/${encodeURIComponent(id)}?includeState=true`,
  );
}

export function loadSessionContext(id: string, leafId: string) {
  const query = new URLSearchParams({ leafId });
  return requestJson<{ context: SessionDetail["context"] }>(
    `/api/sessions/${encodeURIComponent(id)}/context?${query}`,
  );
}

export function loadModels() {
  return requestJson<{
    models: ModelInfo[];
    defaultModel: { provider: string; modelId: string } | null;
  }>("/api/models");
}

export function createAgent(input: {
  cwd: string;
  message: string;
  images?: Array<{ type: "image"; data: string; mimeType: string }>;
  provider?: string;
  modelId?: string;
  thinkingLevel?: ThinkingLevel;
  toolNames?: string[];
}) {
  return requestJson<{ sessionId: string }>("/api/agent/new", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function sendCommand<T = { success: true }>(
  id: string,
  command: AgentCommand,
) {
  return requestJson<T>(`/api/agent/${encodeURIComponent(id)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
}

export function loadRuntime(id: string) {
  return requestJson<{ running: boolean; state?: RuntimeState }>(
    `/api/agent/${encodeURIComponent(id)}`,
  );
}
