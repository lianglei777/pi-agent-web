import type {
  InstallSkillResponse,
  RemoveSkillRequest,
  SetSkillInvocationRequest,
  SkillLoadResponse,
} from "@/contracts/skills";

export type {
  SkillDiagnostic,
  SkillInfo,
  SkillSearchResult,
} from "@/contracts/skills";

export interface InstallSkillInput {
  packageSpec: string;
  scope: "global" | "project";
  cwd?: string;
}

export type RemoveSkillInput = RemoveSkillRequest;
export type InstallSkillResult = InstallSkillResponse;
export type SetSkillInvocationInput = SetSkillInvocationRequest;
export type SkillLoadResult = SkillLoadResponse;
