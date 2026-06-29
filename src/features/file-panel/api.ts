import type { FileEntry } from "./types";

type ApiError = { error?: { message?: string } };

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = (await response.json()) as T & ApiError;
  if (!response.ok) {
    throw new Error(data.error?.message ?? `Request failed (${response.status})`);
  }
  return data;
}

export function loadDirectory(path: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ path, type: "list" });
  return requestJson<FileEntry[]>(`/api/files/_?${params}`, { signal });
}

export function loadFile(path: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ path, type: "read" });
  return requestJson<{ content?: string }>(`/api/files/_?${params}`, {
    signal,
  });
}
