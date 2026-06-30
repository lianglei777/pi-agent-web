import { LoaderCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useI18n } from "@/i18n/use-i18n";
import type { SkillInfo } from "./types";

export function SkillDetail({
  skill,
  saving,
  removing,
  onToggle,
  onRemove,
}: {
  skill: SkillInfo;
  saving: boolean;
  removing: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const enabled = !skill.disableModelInvocation;
  const { t } = useI18n();
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-5">
      <div className="mx-auto max-w-2xl">
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold">{skill.name}</h2>
          <p className="mt-1 text-[13px] leading-5 text-muted">
            {skill.description || t.skills.noDescription}
          </p>
        </div>

        <div className="mt-6 rounded-lg border border-line-subtle bg-panel">
          <div className="flex items-start justify-between gap-4 border-b border-line-subtle p-4">
            <div>
              <h3 className="text-sm font-medium">
                {t.skills.modelInvocation}
              </h3>
              <p className="mt-1 text-xs leading-5 text-muted">
                {t.skills.modelInvocationDescription}{" "}
                <code>/skill:{skill.name}</code> {t.skills.calls}
              </p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex shrink-0">
                  <button
                    aria-busy={saving || undefined}
                    aria-checked={enabled}
                    aria-label={t.skills.allowModelInvocation}
                    className={`group relative h-6 w-11 shrink-0 rounded-full border outline-none transition-colors duration-[var(--motion-fast)] focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:border-line-subtle disabled:bg-[var(--disabled-surface)] ${
                      enabled
                        ? "border-accent bg-accent"
                        : "border-line-strong bg-subtle"
                    }`}
                    disabled={saving || !skill.canModify}
                    onClick={onToggle}
                    role="switch"
                    type="button"
                  >
                    <span
                      className={`absolute left-0.5 top-0.5 flex size-[18px] items-center justify-center rounded-full bg-elevated text-primary transition-transform duration-[var(--motion-standard)] group-disabled:bg-[var(--disabled-text)] ${
                        enabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    >
                      {saving ? (
                        <LoaderCircle className="size-3 animate-spin" />
                      ) : null}
                    </span>
                  </button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                {saving
                  ? t.common.saving
                  : skill.canModify
                    ? enabled
                      ? t.skills.modelInvocationAllowed
                      : t.skills.manualInvocationOnly
                    : t.skills.readOnlySymlink}
              </TooltipContent>
            </Tooltip>
          </div>
          <dl className="grid gap-4 p-4 text-sm sm:grid-cols-2">
            <Detail label={t.skills.source} value={skill.sourceInfo.source} />
            <Detail label={t.skills.scope} value={scopeLabel(skill, t)} />
            <Detail label={t.skills.path} value={skill.displayPath} wide />
          </dl>
        </div>

        <p className="mt-4 rounded-lg bg-hover px-3 py-2 text-xs leading-5 text-muted">
          {!skill.canModify
            ? `${t.skills.readOnlySymlink} `
            : ""}
          {t.skills.changesNotice}
        </p>

        {skill.sourceInfo.scope === "project" ||
        skill.sourceInfo.scope === "user" ? (
          <div className="mt-4 flex justify-end">
            <Button
              aria-label={t.skills.removeSkill}
              disabled={removing || saving}
              onClick={onRemove}
              size="sm"
              type="button"
              variant="outline"
            >
              {removing ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Trash2 />
              )}
              {t.skills.remove}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-xs font-medium text-dim">{label}</dt>
      <dd className="mt-1 break-all font-ui-mono text-xs text-primary">
        {value}
      </dd>
    </div>
  );
}

function scopeLabel(skill: SkillInfo, t: ReturnType<typeof useI18n>["t"]): string {
  if (skill.sourceInfo.scope === "project") return t.common.project;
  if (skill.sourceInfo.scope === "user") return t.common.global;
  return t.skills.path;
}
