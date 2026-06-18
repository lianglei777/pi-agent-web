"use client";

import { useState, useCallback } from "react";
import { testModelConfig } from "../api/models-config-api";
import {
  API_OPTIONS,
  type ConfiguredThinkingLevel,
  type ModelEntry,
  type ModelDiscoverySource,
  type ModelsJson,
  type ModelTestState,
} from "../types";
import { useI18n } from "@/i18n/use-i18n";
import { SectionTitle, Field, inputStyle } from "../shared/form-ui";
import {
  getDefaultThinkingOnLevel,
  getSourceTone,
  getSupportedConfiguredThinkingLevels,
  shouldDisplaySourceBadge,
} from "./model-detail-state";

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
  const [copied, setCopied] = useState(false);
  const { t } = useI18n();
  const currentConfig = JSON.stringify({ providerName, config, model });
  const visibleTestState: ModelTestState =
    testedConfig === currentConfig ? testState : { phase: "idle" };
  const source = model.provenance?.source;
  const hasImageInput = model.input?.includes("image") ?? false;
  const sourceIsKnown = source === "catalog" || source === "inferred";
  const supportedThinkingLevels = getSupportedConfiguredThinkingLevels(model);
  const defaultThinkingLevel = getDefaultThinkingOnLevel(model);

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

  const copyModelId = useCallback(async () => {
    if (!model.id) return;
    await navigator.clipboard?.writeText(model.id);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }, [model.id]);

  let testSummary: string | null = null;
  let testBorderColor = "var(--border)";
  let testBgColor = "var(--bg-panel)";

  if (visibleTestState.phase === "testing") {
    testSummary = t.models.testingConnection;
  } else if (visibleTestState.phase === "success") {
    testSummary = `${t.models.connected} | ${visibleTestState.latencyMs ?? "?"}ms${
      visibleTestState.responseText ? ` | ${visibleTestState.responseText}` : ""
    }`;
    testBorderColor = "rgba(22,163,74,0.25)";
    testBgColor = "rgba(22,163,74,0.08)";
  } else if (visibleTestState.phase === "error") {
    testSummary = `${t.models.failed} | ${visibleTestState.latencyMs ?? "?"}ms | ${visibleTestState.message}`;
    testBorderColor = "rgba(220,38,38,0.25)";
    testBgColor = "rgba(220,38,38,0.08)";
  }

  return (
    <div className="flex flex-col gap-4">
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
                color: "var(--text)",
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
                visibleTestState.phase === "success" ? "var(--success)" : "none",
              border:
                visibleTestState.phase === "success"
                  ? "1px solid var(--success)"
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
              borderColor: "color-mix(in srgb, var(--destructive) 30%, transparent)",
              color: "var(--destructive)",
              background: "none",
            }}
            type="button"
          >
            {t.models.remove}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2.5">
        <Field label={t.models.id}>
          <div
            className="flex min-h-8 items-center gap-2 rounded border px-2.5 text-[12px]"
            style={{
              background: "var(--bg-subtle)",
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
          >
            <span className="min-w-0 flex-1 truncate font-ui-mono">
              {model.id}
            </span>
            <SourceBadge source={source} />
            <button
              className="rounded px-1.5 py-0.5 text-[11px] text-muted hover:bg-hover hover:text-primary"
              disabled={!model.id}
              onClick={() => void copyModelId()}
              type="button"
            >
              {copied ? t.models.copied : t.models.copyId}
            </button>
          </div>
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

      <section className="flex flex-col gap-2">
        <SectionTitle>{t.models.capabilities}</SectionTitle>
        <div className="grid grid-cols-2 gap-2.5">
          <CapabilityToggle
            checked={hasImageInput}
            disabled={sourceIsKnown}
            label={t.models.imageInput}
            onChange={(checked) =>
              onChange({
                ...model,
                input: checked ? ["text", "image"] : ["text"],
              })
            }
            source={source}
            status={hasImageInput ? t.models.supported : t.models.unsupported}
          />
          <CapabilityToggle
            checked={!!model.reasoning}
            disabled={sourceIsKnown}
            label={t.models.reasoningThinking}
            onChange={(checked) =>
              onChange({
                ...model,
                reasoning: checked || undefined,
                thinkingDefaultLevel: checked
                  ? (model.thinkingDefaultLevel ??
                    defaultThinkingLevel ??
                    "high")
                  : undefined,
              })
            }
            source={source}
            status={model.reasoning ? t.models.supported : t.models.unsupported}
          />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <SectionTitle>{t.models.advanced}</SectionTitle>
        <Field label={t.models.apiProtocol}>
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
          <p className="text-[11px] leading-4 text-dim">
            {t.models.apiProtocolDescription}
          </p>
        </Field>

        {model.reasoning && supportedThinkingLevels.length > 0 && (
          <Field label={t.models.thinkingOnDefault}>
            <select
              value={model.thinkingDefaultLevel ?? defaultThinkingLevel ?? "high"}
              onChange={(event) =>
                onChange({
                  ...model,
                  thinkingDefaultLevel: event.target
                    .value as ConfiguredThinkingLevel,
                })
              }
              style={{ ...inputStyle }}
            >
              {supportedThinkingLevels.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
            <p className="text-[11px] leading-4 text-dim">
              {t.models.thinkingOnDefaultDescription}
            </p>
          </Field>
        )}
      </section>
    </div>
  );
}

function CapabilityToggle({
  checked,
  disabled,
  label,
  onChange,
  source,
  status,
}: {
  checked: boolean;
  disabled: boolean;
  label: string;
  onChange: (checked: boolean) => void;
  source?: ModelDiscoverySource;
  status: string;
}) {
  return (
    <label className="flex min-h-12 items-center gap-2 rounded border border-line bg-[var(--bg-subtle)] px-3 py-2 text-[12px] text-muted">
      <input
        checked={checked}
        className="h-[13px] w-[13px] accent-accent"
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-primary">{label}</span>
        <span className="block text-[11px] text-dim">{status}</span>
      </span>
      <SourceBadge source={source} />
    </label>
  );
}

function SourceBadge({
  source,
}: {
  source?: ModelDiscoverySource;
}) {
  const { t } = useI18n();
  if (!shouldDisplaySourceBadge(source)) return null;
  const label = sourceLabel(t.models, source);
  const tone = getSourceTone(source);
  return (
    <span
      className="shrink-0 rounded-full border px-1.5 py-0.5 text-[10px]"
      style={{
        borderColor:
          tone === "known"
            ? "rgba(22,163,74,0.25)"
            : tone === "partial"
              ? "rgba(113,113,122,0.28)"
              : "var(--border)",
        color: tone === "known" ? "var(--success)" : "var(--text-dim)",
        background:
          tone === "known" ? "rgba(22,163,74,0.08)" : "var(--bg-panel)",
      }}
      title={label}
    >
      {label}
    </span>
  );
}

function sourceLabel(
  models: ReturnType<typeof useI18n>["t"]["models"],
  source?: ModelDiscoverySource,
) {
  if (source === "catalog") return models.sourceCatalog;
  if (source === "inferred") return models.sourceInferred;
  if (source === "remote") return models.sourceRemote;
  if (source === "defaulted") return models.sourceDefaulted;
  return "";
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
