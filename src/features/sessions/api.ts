import type { FileEntry, SessionInfo } from "./types";

type ApiError = { error?: { message?: string } };

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = (await response.json()) as T & ApiError;
  if (!response.ok) {
    throw new Error(data.error?.message ?? `Request failed (${response.status})`);
  }
  return data;
}

export function loadSessions() {
  return requestJson<SessionInfo[]>("/api/sessions");
}

export function loadHome() {
  return requestJson<{ home: string }>("/api/home");
}

export function loadDefaultCwd() {
  return requestJson<{ cwd: string }>("/api/default-cwd");
}

export function renameSession(id: string, name: string) {
  return requestJson<{ success: true }>(
    `/api/sessions/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    },
  );
}

export function deleteSession(id: string) {
  return requestJson<{ success: true }>(
    `/api/sessions/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

export function loadDirectory(path: string) {
  const params = new URLSearchParams({ path, type: "list" });
  return requestJson<FileEntry[]>(`/api/files/_?${params}`);
}
