"use client";

import { useState, useCallback } from "react";
import { testModelConfig } from "../api/models-config-api";
import {
  API_OPTIONS,
  type ModelEntry,
  type ModelsJson,
  type ModelTestState,
} from "../types";
import { useI18n } from "@/i18n/use-i18n";
import { SectionTitle, Field, inputStyle } from "../shared/form-ui";
import ThinkingLevelMapEditor from "./thinking-level-editor";

const DEEPSEEK_COMPAT = {
  thinkingFormat: "deepseek",
  requiresReasoningContentOnAssistantMessages: true,
} as const;

interface Props {
  providerName: string;
  config: ModelsJson;
  model: ModelEntry;
  onChange: (m: ModelEntry) => void;
  onDelete: () => void;
}

export default function ModelDetail({
  providerName,
  config,
  model,
  onChange,
  onDelete,
}: Props) {
  const [testState, setTestState] = useState<ModelTestState>({ phase: "idle" });
  const [testedConfig, setTestedConfig] = useState("");
  const { t } = useI18n();
  const currentConfig = JSON.stringify({ providerName, config, model });
  const visibleTestState: ModelTestState =
    testedConfig === currentConfig ? testState : { phase: "idle" };

  const handleTest = useCallback(async () => {
    if (!model.id.trim() || visibleTestState.phase === "testing") return;
    setTestedConfig(currentConfig);
    setTestState({ phase: "testing" });
    try {
      const result = await testModelConfig({
        provider: providerName,
        modelId: model.id.trim(),
        config,
        timeoutMs: 15_000,
      });
      if (!result.ok) {
        setTestState({
          phase: "error",
          message: result.error ?? t.models.modelTestFailed,
          latencyMs: result.latencyMs,
        });
      } else {
        setTestState({
          phase: "success",
          latencyMs: result.latencyMs,
          responseText: result.responseText,
        });
      }
    } catch (e) {
      setTestState({
        phase: "error",
        message: e instanceof Error ? e.message : t.models.unknownError,
      });
    }
  }, [
    providerName,
    config,
    model,
    currentConfig,
    visibleTestState.phase,
    t.models.modelTestFailed,
    t.models.unknownError,
  ]);

  let testSummary: string | null = null;
  let testBorderColor = "var(--border)";
  let testBgColor = "#e5e7eb";

  if (visibleTestState.phase === "testing") {
    testSummary = t.models.testingConnection;
    testBorderColor = "var(--border)";
    testBgColor = "#e5e7eb";
  } else if (visibleTestState.phase === "success") {
    testSummary = `${t.models.connected} | ${visibleTestState.latencyMs ?? "?"}ms${
      visibleTestState.responseText ? ` | ${visibleTestState.responseText}` : ""
    }`;
    testBorderColor = "#bbf7d0";
    testBgColor = "#dcfce7";
  } else if (visibleTestState.phase === "error") {
    testSummary = `${t.models.failed} | ${visibleTestState.latencyMs ?? "?"}ms | ${visibleTestState.message}`;
    testBorderColor = "#fecaca";
    testBgColor = "#fee2e2";
  }

  const hasImageInput =
    model.input?.includes("image") ?? false;

  const isDeepSeekCompat =
    model.compat?.thinkingFormat === "deepseek" &&
    model.compat?.requiresReasoningContentOnAssistantMessages === true;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <SectionTitle>{t.models.model}</SectionTitle>
        <div className="flex items-center gap-2">
          {testSummary && (
            <span
              title={testSummary}
              className="inline-flex h-6 max-w-[260px] items-center overflow-hidden text-ellipsis whitespace-nowrap rounded border px-2 text-[11px]"
              style={{
                borderColor: testBorderColor,
                background: testBgColor,
                color: "#111827",
                boxSizing: "border-box",
              }}
            >
              {testSummary}
            </span>
          )}
          <button
            onClick={handleTest}
            disabled={!model.id.trim() || visibleTestState.phase === "testing"}
            className="flex items-center gap-1 rounded px-2 py-[3px] text-[11px]"
            style={{
              background:
                visibleTestState.phase === "success" ? "#16a34a" : "none",
              border:
                visibleTestState.phase === "success"
                  ? "1px solid #16a34a"
                  : "1px solid var(--border)",
              color:
                visibleTestState.phase === "success"
                  ? "#fff"
                  : !model.id.trim() || visibleTestState.phase === "testing"
                    ? "var(--text-dim)"
                    : "var(--text-muted)",
              cursor:
                !model.id.trim() || visibleTestState.phase === "testing"
                  ? "not-allowed"
                  : "pointer",
            }}
            type="button"
          >
            {visibleTestState.phase === "success" && <CheckIcon />}
            {visibleTestState.phase === "testing"
              ? t.models.testing
              : visibleTestState.phase === "success"
                ? t.models.ok
                : t.models.test}
          </button>
          <button
            onClick={onDelete}
            className="cursor-pointer rounded border px-2 py-[3px] text-[11px]"
            style={{
              borderColor: "rgba(239,68,68,0.3)",
              color: "#ef4444",
              background: "none",
            }}
            type="button"
          >
            {t.models.remove}
          </button>
        </div>
      </div>

      {/* Row 1: ID + Name */}
      <div className="grid grid-cols-2 gap-2.5">
        <Field label={t.models.id}>
          <input
            value={model.id}
            onChange={(e) => onChange({ ...model, id: e.target.value })}
            className="font-ui-mono"
            style={{ ...inputStyle }}
          />
        </Field>
        <Field label={t.models.name}>
          <input
            value={model.name ?? ""}
            onChange={(e) =>
              onChange({
                ...model,
                name: e.target.value || undefined,
              })
            }
            style={{ ...inputStyle }}
          />
        </Field>
      </div>

      {/* API override */}
      <Field label={t.models.apiOverride}>
        <select
          value={model.api ?? ""}
          onChange={(e) =>
            onChange({
              ...model,
              api: e.target.value || undefined,
            })
          }
          style={{
            ...inputStyle,
            color: model.api ? "var(--text)" : "var(--text-dim)",
          }}
        >
          <option value="">{t.models.inheritNone}</option>
          {API_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </Field>

      {/* Checkboxes */}
      <div className="flex gap-6">
        <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-muted">
          <input
            type="checkbox"
            checked={!!model.reasoning}
            onChange={(e) =>
              onChange({
                ...model,
                reasoning: e.target.checked || undefined,
              })
            }
            className="h-[13px] w-[13px] accent-accent"
          />
          {t.models.reasoningThinking}
        </label>
        <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-muted">
          <input
            type="checkbox"
            checked={hasImageInput}
            onChange={(e) =>
              onChange({
                ...model,
                input: e.target.checked
                  ? ["text", "image"]
                  : undefined,
              })
            }
            className="h-[13px] w-[13px] accent-accent"
          />
          {t.models.imageInput}
        </label>
      </div>

      {/* DeepSeek compat (only when reasoning) */}
      {model.reasoning && (
        <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-muted">
          <input
            type="checkbox"
            checked={isDeepSeekCompat}
            onChange={(e) => {
              const next = { ...model };
              if (e.target.checked) {
                next.compat = { ...next.compat, ...DEEPSEEK_COMPAT };
              } else if (next.compat) {
                next.compat = Object.fromEntries(
                  Object.entries(next.compat).filter(
                    ([k]) =>
                      k !== "thinkingFormat" &&
                      k !== "requiresReasoningContentOnAssistantMessages",
                  ),
                );
                if (Object.keys(next.compat).length === 0) {
                  next.compat = undefined;
                }
              }
              onChange(next);
            }}
            className="h-[13px] w-[13px] accent-accent"
          />
          {t.models.deepSeekCompat}
        </label>
      )}

      {/* Thinking level map (only when reasoning) */}
      {model.reasoning && (
        <ThinkingLevelMapEditor
          value={model.thinkingLevelMap}
          onChange={(v) =>
            onChange({
              ...model,
              thinkingLevelMap: v,
            })
          }
        />
      )}

      {/* Row 4: Context window + Max output tokens */}
      <div className="grid grid-cols-2 gap-2.5">
        <Field label={t.models.contextWindow}>
          <input
            type="number"
            value={model.contextWindow ?? ""}
            onChange={(e) =>
              onChange({
                ...model,
                contextWindow: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
            placeholder="128000"
            style={{ ...inputStyle }}
          />
        </Field>
        <Field label={t.models.maxOutputTokens}>
          <input
            type="number"
            value={model.maxTokens ?? ""}
            onChange={(e) =>
              onChange({
                ...model,
                maxTokens: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
            placeholder="16384"
            style={{ ...inputStyle }}
          />
        </Field>
      </div>

      {/* Cost */}
      <div>
        <SectionTitle>{t.models.costPerMillionTokens}</SectionTitle>
        <div className="mt-2 grid grid-cols-4 gap-2">
          <Field label={t.models.input}>
            <input
              type="number"
              step="0.01"
              value={model.cost?.input ?? ""}
              onChange={(e) =>
                onChange({
                  ...model,
                  cost: {
                    ...model.cost,
                    input: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  },
                })
              }
              style={{ ...inputStyle }}
            />
          </Field>
          <Field label={t.models.output}>
            <input
              type="number"
              step="0.01"
              value={model.cost?.output ?? ""}
              onChange={(e) =>
                onChange({
                  ...model,
                  cost: {
                    ...model.cost,
                    output: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  },
                })
              }
              style={{ ...inputStyle }}
            />
          </Field>
          <Field label={t.models.cacheRead}>
            <input
              type="number"
              step="0.01"
              value={model.cost?.cacheRead ?? ""}
              onChange={(e) =>
                onChange({
                  ...model,
                  cost: {
                    ...model.cost,
                    cacheRead: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  },
                })
              }
              style={{ ...inputStyle }}
            />
          </Field>
          <Field label={t.models.cacheWrite}>
            <input
              type="number"
              step="0.01"
              value={model.cost?.cacheWrite ?? ""}
              onChange={(e) =>
                onChange({
                  ...model,
                  cost: {
                    ...model.cost,
                    cacheWrite: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  },
                })
              }
              style={{ ...inputStyle }}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
