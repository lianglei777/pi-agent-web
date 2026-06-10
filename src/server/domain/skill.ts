export interface SkillInfo {
  name: string;
  description: string;
  filePath: string;
  baseDir: string;
  source: string;
  disableModelInvocation: boolean;
}

export interface SkillDiagnostic {
  severity: string;
  message: string;
  path?: string;
}

export interface SkillSearchResult {
  name: string;
  description: string;
  source: string;
  installRef: string;
}

export interface InstallSkillInput {
  source: string;
  scope: "global" | "project";
  cwd?: string;
}

export interface InstallSkillResult {
  installed: boolean;
  stdout?: string;
  stderr?: string;
}

