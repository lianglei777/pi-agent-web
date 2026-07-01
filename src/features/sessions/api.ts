import type { ApiErrorResponse, SuccessResponse } from "@/contracts/common";
import type {
  AddProjectRequest,
  AddProjectResponse,
  BrowseProjectsResponse,
  ListProjectsResponse,
} from "@/contracts/projects";
import type {
  DeleteSessionResponse,
  ListSessionsResponse,
  RenameSessionRequest,
  RenameSessionResponse,
} from "@/contracts/sessions";
import type { HomeResponse } from "@/contracts/system";

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = (await response.json()) as T | ApiErrorResponse;
  if (!response.ok) {
    const failure = data as ApiErrorResponse;
    throw new Error(
      failure.error?.message ?? `Request failed (${response.status})`,
    );
  }
  return data as T;
}

export function loadSessions() {
  return requestJson<ListSessionsResponse>("/api/sessions");
}

export function loadHome() {
  return requestJson<HomeResponse>("/api/home");
}

export function loadProjects() {
  return requestJson<ListProjectsResponse>("/api/projects");
}

export function addProject(path: string) {
  const body: AddProjectRequest = { path };
  return requestJson<AddProjectResponse>("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function removeProject(path: string) {
  return requestJson<SuccessResponse>(
    `/api/projects?path=${encodeURIComponent(path)}`,
    { method: "DELETE" },
  );
}

export function browseProjects(path?: string) {
  const query = path ? `?path=${encodeURIComponent(path)}` : "";
  return requestJson<BrowseProjectsResponse>(`/api/projects/browse${query}`);
}

export function renameSession(id: string, name: string) {
  const body: RenameSessionRequest = { name };
  return requestJson<RenameSessionResponse>(
    `/api/sessions/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

export function deleteSession(id: string) {
  return requestJson<DeleteSessionResponse>(
    `/api/sessions/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}
