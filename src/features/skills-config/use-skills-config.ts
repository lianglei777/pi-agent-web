"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadSkills, setSkillModelInvocation } from "./api";
import { useI18n } from "@/i18n/use-i18n";
import { reconcileSelectedSkill } from "./skill-state";
import type { SkillLoadResult } from "./types";

const EMPTY_RESULT: SkillLoadResult = {
  skills: [],
  diagnostics: [],
};

export function useSkillsConfig(cwd: string) {
  const { t } = useI18n();
  const [result, setResult] = useState(EMPTY_RESULT);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSkillId, setSavingSkillId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  const applyResult = useCallback((next: SkillLoadResult) => {
    setResult(next);
    setSelectedSkillId((current) =>
      reconcileSelectedSkill(next.skills, current),
    );
  }, []);

  const refresh = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setSavingSkillId(null);
    setLoading(true);
    setError(null);
    try {
      applyResult(await loadSkills(cwd, controller.signal));
    } catch (nextError) {
      if (!controller.signal.aborted) {
        setError(errorMessage(nextError, t.skills.somethingWentWrong));
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [applyResult, cwd, t.skills.somethingWentWrong]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => {
      window.clearTimeout(timer);
      requestRef.current?.abort();
    };
  }, [cwd, refresh]);

  const selectedSkill = useMemo(
    () =>
      result.skills.find((skill) => skill.skillId === selectedSkillId) ??
      null,
    [result.skills, selectedSkillId],
  );

  const toggleModelInvocation = useCallback(async () => {
    if (!selectedSkill) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(false);
    setSavingSkillId(selectedSkill.skillId);
    setError(null);
    try {
      applyResult(
        await setSkillModelInvocation(
          {
            cwd,
            skillId: selectedSkill.skillId,
            disabled: !selectedSkill.disableModelInvocation,
            expectedVersion: selectedSkill.version,
          },
          controller.signal,
        ),
      );
    } catch (nextError) {
      if (!controller.signal.aborted) {
        setError(errorMessage(nextError, t.skills.somethingWentWrong));
      }
    } finally {
      if (!controller.signal.aborted) setSavingSkillId(null);
    }
  }, [applyResult, cwd, selectedSkill, t.skills.somethingWentWrong]);

  return {
    ...result,
    error,
    loading,
    refresh,
    savingSkillId,
    selectedSkill,
    selectedSkillId,
    setSelectedSkillId,
    toggleModelInvocation,
  };
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
