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

export interface InstallSkillInput {
  packageSpec: string;
  scope: "global" | "project";
  cwd?: string;
}

export interface InstallSkillResult {
  installed: true;
  skills: SkillInfo[];
}

export interface SetSkillInvocationInput {
  cwd: string;
  skillId: string;
  disabled: boolean;
  expectedVersion?: string;
}

export interface SkillLoadResult {
  skills: SkillInfo[];
  diagnostics: SkillDiagnostic[];
}
