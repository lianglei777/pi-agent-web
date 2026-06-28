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

export interface SkillLoadResult {
  skills: SkillInfo[];
  diagnostics: SkillDiagnostic[];
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

export interface InstallSkillResult {
  installed: true;
  skills: SkillInfo[];
}
