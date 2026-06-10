import type { InstallSkillInput } from "@/server/domain/skill";
import type { SkillProvider } from "@/server/ports/skill-provider";

export class SkillService {
  constructor(private readonly skills: SkillProvider) {}

  load(cwd: string) {
    return this.skills.load(cwd);
  }

  setModelInvocationDisabled(filePath: string, disabled: boolean) {
    return this.skills.setModelInvocationDisabled(filePath, disabled);
  }

  search(query: string, limit = 20) {
    return this.skills.search(query, limit);
  }

  install(input: InstallSkillInput) {
    return this.skills.install(input);
  }
}

