import type { ApiErrorResponse } from "@/contracts/common";
import type {
  InstallSkillRequest,
  InstallSkillResponse,
  RemoveSkillRequest,
  RemoveSkillResponse,
  SearchSkillsRequest,
  SearchSkillsResponse,
  SetSkillInvocationRequest,
  SkillLoadResponse,
  SkillSearchResult,
} from "@/contracts/skills";

export async function loadSkills(
  cwd: string,
  signal?: AbortSignal,
): Promise<SkillLoadResponse> {
  return requestJson(
    `/api/skills?cwd=${encodeURIComponent(cwd)}`,
    { signal },
  );
}

export async function setSkillModelInvocation(
  input: SetSkillInvocationRequest,
  signal?: AbortSignal,
): Promise<SkillLoadResponse> {
  return requestJson("/api/skills", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });
}

export async function searchSkills(
  query: string,
  signal?: AbortSignal,
): Promise<SkillSearchResult[]> {
  const body: SearchSkillsRequest = { query, limit: 30 };
  const response = await requestJson<SearchSkillsResponse>(
    "/api/skills/search",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    },
  );
  return response.results;
}

export async function installSkill(
  input: InstallSkillRequest,
  signal?: AbortSignal,
): Promise<InstallSkillResponse> {
  return requestJson("/api/skills/install", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });
}

export async function removeSkill(
  input: RemoveSkillRequest,
  signal?: AbortSignal,
): Promise<RemoveSkillResponse> {
  return requestJson("/api/skills", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });
}

async function requestJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, init);
  const payload = (await response.json().catch(() => null)) as
    | T
    | ApiErrorResponse
    | null;
  if (!response.ok) {
    const failure = payload as ApiErrorResponse | null;
    throw new Error(
      failure?.error?.message ?? `Request failed with ${response.status}`,
    );
  }
  return payload as T;
}
