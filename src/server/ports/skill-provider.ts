import type {
  InstallSkillInput,
  InstallSkillResult,
  SkillDiagnostic,
  SkillInfo,
  SkillSearchResult,
} from "@/server/domain/skill";

export interface SkillProvider {
  load(cwd: string): Promise<{
    skills: SkillInfo[];
    diagnostics: SkillDiagnostic[];
  }>;
  setModelInvocationDisabled(
    filePath: string,
    disabled: boolean,
  ): Promise<void>;
  search(query: string, limit: number): Promise<SkillSearchResult[]>;
  install(input: InstallSkillInput): Promise<InstallSkillResult>;
}

