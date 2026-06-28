"use client";

import {
  AlertTriangle,
  LoaderCircle,
  Plus,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/i18n/use-i18n";
import { AddSkillPanel } from "./add-skill-panel";
import { SkillDetail } from "./skill-detail";
import { SkillList } from "./skill-list";
import { useSkillsConfig } from "./use-skills-config";

export function SkillsConfigDialog({
  cwd,
  onClose,
}: {
  cwd: string;
  onClose: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const skills = useSkillsConfig(cwd);
  const { t } = useI18n();

  return (
    <Dialog open>
      <DialogContent
        aria-describedby="skills-config-description"
        className="h-[78vh] w-[min(860px,calc(100vw-32px))] max-w-none grid-cols-1 grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-lg border-line-strong bg-canvas p-0 sm:max-w-none"
        showCloseButton={false}
      >
        <header className="flex min-h-[49px] shrink-0 items-center gap-3 border-b border-line-strong bg-panel px-[18px] py-3">
          <Sparkles className="size-4" />
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-display text-xl">
              {t.skills.title}
            </DialogTitle>
            <DialogDescription
              className="truncate text-xs"
              id="skills-config-description"
            >
              {cwd}
            </DialogDescription>
          </div>
          <Button
            aria-label={t.skills.refreshSkills}
            disabled={skills.loading}
            onClick={() => void skills.refresh()}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <RefreshCw className={skills.loading ? "animate-spin" : ""} />
          </Button>
          <Button
            aria-label={t.skills.closeSkills}
            onClick={onClose}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <X />
          </Button>
        </header>

        <div className="flex min-h-0">
          <aside className="flex min-h-0 w-[210px] shrink-0 flex-col border-r border-line-strong bg-panel">
            <div className="p-2">
              <Button
                aria-pressed={adding}
                className="w-full justify-start"
                onClick={() => setAdding((current) => !current)}
                size="sm"
                type="button"
                variant={adding ? "secondary" : "ghost"}
              >
                <Plus />
                {t.skills.addSkill}
              </Button>
            </div>

            {skills.loading && skills.skills.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-muted">
                <LoaderCircle className="size-5 animate-spin" />
                <span className="sr-only">{t.skills.loadingSkills}</span>
              </div>
            ) : skills.skills.length > 0 ? (
              <SkillList
                onSelect={(skillId) => {
                  setAdding(false);
                  skills.setSelectedSkillId(skillId);
                }}
                selectedSkillId={skills.selectedSkillId}
                skills={skills.skills}
              />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
                <Sparkles className="size-6 text-dim" />
                <p className="mt-3 text-sm font-medium">
                  {t.skills.noSkillsFound}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {t.skills.noSkillsFoundDescription}
                </p>
              </div>
            )}

            {skills.diagnostics.length > 0 ? (
              <details className="border-t border-line p-3 text-xs">
                <summary className="flex cursor-pointer items-center gap-2 text-muted">
                  <AlertTriangle className="size-3.5" />
                  {skills.diagnostics.length}{" "}
                  {skills.diagnostics.length === 1
                    ? t.skills.diagnostic
                    : t.skills.diagnostics}
                </summary>
                <ul className="mt-2 space-y-2 text-muted">
                  {skills.diagnostics.map((diagnostic, index) => (
                    <li key={`${diagnostic.message}-${index}`}>
                      <span
                        className={`mr-1.5 font-medium ${
                          diagnostic.severity === "warning"
                            ? "text-warning"
                            : diagnostic.severity === "error"
                              ? "text-destructive"
                              : "text-primary"
                        }`}
                      >
                        {t.skills.diagnosticSeverity[diagnostic.severity]}
                      </span>
                      <span>{diagnostic.message}</span>
                      {diagnostic.path ? (
                        <span className="mt-0.5 block break-all font-ui-mono text-[11px] text-dim">
                          {diagnostic.path}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </aside>

          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            {skills.error ? (
              <div
                aria-live="polite"
                className="flex items-center justify-between gap-3 border-b border-destructive/25 bg-destructive/8 px-4 py-2 text-sm text-destructive"
                role="alert"
              >
                <span>{skills.error}</span>
                <Button
                  onClick={() => void skills.refresh()}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  {t.common.retry}
                </Button>
              </div>
            ) : null}
            {adding ? (
              <AddSkillPanel
                cwd={cwd}
                onInstalled={(result) => {
                  const installedSkillId = result.skills[0]?.skillId;
                  if (installedSkillId) {
                    skills.setSelectedSkillId(installedSkillId);
                  }
                  setAdding(false);
                  void skills.refresh();
                }}
              />
            ) : skills.selectedSkill ? (
              <SkillDetail
                onToggle={() => void skills.toggleModelInvocation()}
                saving={
                  skills.savingSkillId === skills.selectedSkill.skillId
                }
                skill={skills.selectedSkill}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted">
                {t.skills.selectSkill}
              </div>
            )}
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
}
