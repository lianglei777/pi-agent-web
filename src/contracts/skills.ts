export interface SkillInfo {
  skillId: string;
  name: string;
  description: string;
  filePath: string;
  displayPath: string;
  baseDir: string;
  sourceInfo: {
    path: string;
    source: string;
    scope: "user" | "project" | "temporary";
    origin: "package" | "top-level";
    baseDir?: string;
  };
  canModify: boolean;
  disableModelInvocation: boolean;
  version: string;
}

export interface SkillDiagnostic {
  severity: "warning" | "error" | "collision";
  message: string;
  path?: string;
}

export interface SkillSearchResult {
  id: string;
  name: string;
  description: string;
  source: string;
  packageSpec: string;
  installs?: number;
  url?: string;
}

export interface SkillLoadResponse {
  skills: SkillInfo[];
  diagnostics: SkillDiagnostic[];
}

export interface SetSkillInvocationRequest {
  cwd: string;
  skillId: string;
  disabled: boolean;
  expectedVersion?: string;
}

export interface SearchSkillsRequest {
  query: string;
  limit?: number;
}

export interface SearchSkillsResponse {
  results: SkillSearchResult[];
}

export interface InstallSkillRequest {
  package: string;
  scope: "global" | "project";
  cwd?: string;
}

export interface InstallSkillResponse {
  installed: true;
  skills: SkillInfo[];
}

export interface RemoveSkillRequest {
  skillId: string;
  cwd: string;
}

export type RemoveSkillResponse = SkillLoadResponse;
