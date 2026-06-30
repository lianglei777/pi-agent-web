import { describe, expect, it } from "vitest";
import { groupSkills, reconcileSelectedSkill, sourceLabel } from "./skill-state";
import type { Dictionary } from "@/i18n/dictionary";
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

  describe("sourceLabel", () => {
    const skills: Dictionary["skills"] = {
      sourceLocal: "本地配置",
      sourceAuto: "自动发现",
      sourceCli: "命令行传入",
    } as Dictionary["skills"];

    it("maps local source to readable label", () => {
      expect(sourceLabel("local", "top-level", skills)).toBe("本地配置");
    });

    it("maps auto source to readable label", () => {
      expect(sourceLabel("auto", "top-level", skills)).toBe("自动发现");
    });

    it("maps cli source to readable label", () => {
      expect(sourceLabel("cli", "top-level", skills)).toBe("命令行传入");
    });

    it("preserves package name for package origin", () => {
      expect(sourceLabel("@scope/skill-pkg", "package", skills)).toBe(
        "@scope/skill-pkg",
      );
    });

    it("falls back to raw source for unknown values", () => {
      expect(sourceLabel("/custom/skills", "top-level", skills)).toBe(
        "/custom/skills",
      );
    });
  });
});
