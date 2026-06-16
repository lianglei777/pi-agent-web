"use client";

import {
  CheckCircle2,
  Download,
  LoaderCircle,
  Search,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/use-i18n";
import { installSkill, searchSkills } from "./api";
import type { InstallSkillResult, SkillSearchResult } from "./types";

export function AddSkillPanel({
  cwd,
  onInstalled,
}: {
  cwd: string;
  onInstalled: (result: InstallSkillResult) => void;
}) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"project" | "global">("project");
  const [results, setResults] = useState<SkillSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const searchRequest = useRef<AbortController | null>(null);
  const installRequest = useRef<AbortController | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    return () => {
      searchRequest.current?.abort();
      installRequest.current?.abort();
    };
  }, [cwd]);

  useEffect(() => {
    searchRequest.current?.abort();
    const normalized = query.trim();
    if (!normalized) return;
    const controller = new AbortController();
    searchRequest.current = controller;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setError(null);
      try {
        setResults(await searchSkills(normalized, controller.signal));
      } catch (nextError) {
        if (!controller.signal.aborted) {
          setError(errorMessage(nextError, t.skills.somethingWentWrong));
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, t.skills.somethingWentWrong]);

  async function handleInstall(skill: SkillSearchResult) {
    if (installing) return;
    const controller = new AbortController();
    installRequest.current = controller;
    setInstalling(skill.id);
    setError(null);
    setSuccess(null);
    try {
      const result = await installSkill(
        { package: skill.packageSpec, scope, cwd },
        controller.signal,
      );
      const paths = result.skills.map((item) => item.displayPath).join(", ");
      setSuccess(
        `${t.skills.installed} ${skill.name}${paths ? ` ${t.skills.at} ${paths}` : ""}.`,
      );
      onInstalled(result);
    } catch (nextError) {
      if (!controller.signal.aborted) {
        setError(errorMessage(nextError, t.skills.somethingWentWrong));
      }
    } finally {
      if (!controller.signal.aborted) setInstalling(null);
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-5">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-[15px] font-semibold">{t.skills.addSkill}</h2>
        <p className="mt-1 text-[13px] text-muted">
          {t.skills.searchMarketDescription}
        </p>

        <div className="relative mt-5">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-dim" />
          <input
            aria-label={t.skills.searchSkillsMarket}
            autoFocus
            className="h-10 w-full rounded-lg border border-line bg-panel pl-9 pr-9 outline-none focus:border-muted focus:ring-2 focus:ring-ring/20"
            onChange={(event) => {
              const value = event.target.value;
              setQuery(value);
              if (!value.trim()) {
                setResults([]);
                setSearching(false);
                setError(null);
              }
            }}
            placeholder={t.skills.searchSkills}
            value={query}
          />
          {searching ? (
            <LoaderCircle className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted" />
          ) : null}
        </div>

        <div
          aria-label={t.skills.installationScope}
          className="mt-3 inline-flex rounded-lg border border-line bg-panel p-1"
          role="radiogroup"
        >
          {(["project", "global"] as const).map((value) => (
            <button
              aria-checked={scope === value}
              className={`rounded-md px-3 py-1.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${
                scope === value ? "bg-selected text-primary" : "text-muted"
              }`}
              key={value}
              onClick={() => setScope(value)}
              role="radio"
              type="button"
            >
              {value === "project" ? t.common.project : t.common.global}
            </button>
          ))}
        </div>

        {error ? (
          <p className="mt-3 rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="mt-3 flex items-start gap-2 rounded-lg border border-line bg-hover px-3 py-2 text-sm">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            {success}
          </p>
        ) : null}

        <div className="mt-4 space-y-2">
          {!searching && query.trim() && results.length === 0 && !error ? (
            <p className="rounded-lg border border-dashed border-line p-8 text-center text-sm text-muted">
              {t.skills.noMatchingSkills}
            </p>
          ) : null}
          {results.map((skill) => (
            <article
              className="flex items-start gap-3 rounded-xl border border-line bg-panel p-4"
              key={skill.id}
            >
              <div className="min-w-0 flex-1">
                <h3 className="font-medium">{skill.name}</h3>
                <p className="mt-0.5 text-xs text-muted">{skill.source}</p>
                {skill.description ? (
                  <p className="mt-2 text-sm leading-5 text-muted">
                    {skill.description}
                  </p>
                ) : null}
                {skill.installs !== undefined ? (
                  <p className="mt-2 text-xs text-dim">
                    {skill.installs.toLocaleString()} {t.skills.installs}
                  </p>
                ) : null}
              </div>
              <Button
                aria-label={`${t.skills.install} ${skill.name}`}
                disabled={installing !== null}
                onClick={() => void handleInstall(skill)}
                size="sm"
                type="button"
                variant="outline"
              >
                {installing === skill.id ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Download />
                )}
                {t.skills.install}
              </Button>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
