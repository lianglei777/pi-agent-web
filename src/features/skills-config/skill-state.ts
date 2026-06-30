import type { Dictionary } from "@/i18n/dictionary";
import type { SkillInfo } from "./types";

export interface SkillGroup {
  id: string;
  scope: SkillInfo["sourceInfo"]["scope"];
  detail: string;
  origin: SkillInfo["sourceInfo"]["origin"];
  skills: SkillInfo[];
}

export function groupSkills(skills: SkillInfo[]): SkillGroup[] {
  const groups = new Map<string, SkillGroup>();
  for (const skill of skills) {
    const id = groupId(skill);
    const group = groups.get(id) ?? {
      id,
      scope: skill.sourceInfo.scope,
      detail: skill.sourceInfo.source,
      origin: skill.sourceInfo.origin,
      skills: [],
    };
    group.skills.push(skill);
    groups.set(id, group);
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      skills: [...group.skills].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    }))
    .sort((a, b) => groupRank(a.id) - groupRank(b.id));
}

export function reconcileSelectedSkill(
  skills: SkillInfo[],
  selectedSkillId: string | null,
): string | null {
  if (
    selectedSkillId &&
    skills.some((skill) => skill.skillId === selectedSkillId)
  ) {
    return selectedSkillId;
  }
  return skills[0]?.skillId ?? null;
}

function groupId(skill: SkillInfo): string {
  if (skill.sourceInfo.scope === "project") return "project";
  if (skill.sourceInfo.scope === "user") return "global";
  return `path:${skill.sourceInfo.source}`;
}

function groupRank(id: string): number {
  if (id === "project") return 0;
  if (id === "global") return 1;
  return 2;
}

// 将技能来源的内部标识映射为用户可读的标签
export function sourceLabel(
  source: string,
  origin: SkillInfo["sourceInfo"]["origin"],
  t: Dictionary["skills"],
): string {
  // 包安装来源保留原始包名 / git URL，信息量更高
  if (origin === "package") return source;
  if (source === "local") return t.sourceLocal;
  if (source === "auto") return t.sourceAuto;
  if (source === "cli") return t.sourceCli;
  // 兜底：保留原始值（如临时路径分组的自定义来源标识）
  return source;
}
