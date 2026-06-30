"use client";

import {
  CheckCircle2,
  Download,
  ExternalLink,
  LoaderCircle,
  Search,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
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
            className="h-10 w-full rounded-md border border-line-subtle bg-panel pr-9 pl-9 outline-none focus:border-ring focus:ring-2 focus:ring-ring/35"
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
          className="mt-3 inline-flex rounded-lg border border-line-subtle bg-panel p-1"
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
          <p className="mt-3 flex items-start gap-2 rounded-lg border border-success/30 bg-success/8 px-3 py-2 text-sm text-success">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            {success}
          </p>
        ) : null}

        <div className="mt-4 space-y-2">
          {!searching && query.trim() && results.length === 0 && !error ? (
            <p className="rounded-lg border border-dashed border-line-subtle p-8 text-center text-sm text-muted">
              {t.skills.noMatchingSkills}
            </p>
          ) : null}
          {results.map((skill) => (
            <article
              className="border-b border-line-subtle bg-panel p-4 last:border-b-0"
              key={skill.id}
            >
              {/* 标题行：技能名称 + source 标签 + 详情链接 */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <h3 className="truncate text-sm font-medium">{skill.name}</h3>
                  {skill.url ? (
                    <a
                      href={skill.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 text-dim transition-colors hover:text-muted"
                      aria-label={`${t.skills.viewDetails} ${skill.name}`}
                    >
                      <ExternalLink className="size-3" />
                    </a>
                  ) : null}
                </div>
                <Badge
                  className="shrink-0 font-ui-mono text-dim"
                  variant="outline"
                >
                  {skill.source}
                </Badge>
              </div>
              {/* 描述行：两行截断，空描述时回退到占位文案 */}
              <p
                className={`mt-1.5 line-clamp-2 text-[13px] leading-5 ${
                  skill.description ? "text-muted" : "italic text-dim"
                }`}
              >
                {skill.description || t.skills.noDescription}
              </p>
              {/* 元数据 + 操作行：包引用、安装量、安装按钮 */}
              <div className="mt-2.5 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2 text-[11px] text-dim">
                  <code className="rounded border border-line-subtle bg-subtle px-1.5 py-0.5 font-ui-mono text-[11px]">
                    {skill.packageSpec}
                  </code>
                  {skill.installs !== undefined ? (
                    <span className="inline-flex shrink-0 items-center gap-1">
                      <Download className="size-3" />
                      {skill.installs.toLocaleString()} {t.skills.installs}
                    </span>
                  ) : null}
                </div>
                <Button
                  aria-label={`${t.skills.install} ${skill.name}`}
                  className="shrink-0"
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
              </div>
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
