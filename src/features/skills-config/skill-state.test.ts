import { describe, expect, it } from "vitest";
import { groupSkills, reconcileSelectedSkill } from "./skill-state";
import type { SkillInfo } from "./types";

const base: SkillInfo = {
  skillId: "project-id",
  name: "demo",
  description: "",
  filePath: "/work/SKILL.md",
  displayPath: "SKILL.md",
  baseDir: "/work",
  sourceInfo: {
    path: "/work",
    source: "project",
    scope: "project",
    origin: "top-level",
  },
  canModify: true,
  disableModelInvocation: false,
  version: "v1",
};

describe("skills config state", () => {
  it("groups same-name skills by actual resource source", () => {
    const global = {
      ...base,
      skillId: "global-id",
      sourceInfo: {
        ...base.sourceInfo,
        source: "global",
        scope: "user" as const,
      },
    };
    const pathSkill = {
      ...base,
      skillId: "path-id",
      sourceInfo: {
        ...base.sourceInfo,
        source: "/custom/skills",
        scope: "temporary" as const,
      },
    };

    expect(groupSkills([global, pathSkill, base]).map((group) => group.scope))
      .toEqual(["project", "user", "temporary"]);
  });

  it("keeps selection after refresh and repairs a missing selection", () => {
    expect(reconcileSelectedSkill([base], base.skillId)).toBe(base.skillId);
    expect(reconcileSelectedSkill([base], "removed")).toBe(base.skillId);
    expect(reconcileSelectedSkill([], "removed")).toBeNull();
  });
});
