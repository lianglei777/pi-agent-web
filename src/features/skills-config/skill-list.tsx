import { Check, CircleSlash2 } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import { groupSkills } from "./skill-state";
import type { SkillInfo } from "./types";

export function SkillList({
  skills,
  selectedSkillId,
  onSelect,
}: {
  skills: SkillInfo[];
  selectedSkillId: string | null;
  onSelect: (skillId: string) => void;
}) {
  const { t } = useI18n();

  return (
    <div
      aria-label={t.skills.title}
      className="min-h-0 flex-1 overflow-y-auto p-2"
      role="listbox"
    >
      {groupSkills(skills).map((group) => (
        <section aria-labelledby={`skill-group-${group.id}`} key={group.id}>
          <div className="px-2 pb-1 pt-3">
            <h3
              className="text-[11px] font-semibold uppercase tracking-[0.12em] text-dim"
              id={`skill-group-${group.id}`}
            >
              {group.label}
            </h3>
            <p className="truncate text-[11px] text-dim" title={group.detail}>
              {group.detail}
            </p>
          </div>
          {group.skills.map((skill) => {
            const selected = skill.skillId === selectedSkillId;
            return (
              <button
                aria-selected={selected}
                className={`mb-1 flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 ${
                  selected ? "bg-selected" : "hover:bg-hover"
                }`}
                key={skill.skillId}
                onClick={() => onSelect(skill.skillId)}
                role="option"
                type="button"
              >
                <span className="mt-0.5 rounded-md border border-line bg-panel p-1">
                  {skill.disableModelInvocation ? (
                    <CircleSlash2 className="size-3.5 text-dim" />
                  ) : (
                    <Check className="size-3.5 text-primary" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {skill.name}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {skill.description || skill.displayPath}
                  </span>
                </span>
              </button>
            );
          })}
        </section>
      ))}
    </div>
  );
}
