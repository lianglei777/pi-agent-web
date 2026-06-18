"use client";

import { useState } from "react";
import {
  API_OPTIONS,
  type ModelDiscoverySuggestion,
  type ProviderEntry,
} from "../types";
import { useI18n } from "@/i18n/use-i18n";
import { SectionTitle, Field, inputStyle } from "../shared/form-ui";

interface Props {
  name: string;
  provider: ProviderEntry;
  onChange: (p: ProviderEntry) => void;
  onRename: (oldName: string, newName: string) => void;
  onDelete: (name: string) => void;
  discovery: DiscoveryState;
  onDiscoverModels: (providerName: string) => void;
  onAcceptDiscoveredModels: (providerName: string) => void;
}

type DiscoveryState =
  | { phase: "idle" }
  | { phase: "discovering"; providerName: string }
  | {
      phase: "result";
      providerName: string;
      models: ModelDiscoverySuggestion[];
      remoteError?: string;
    }
  | { phase: "error"; providerName: string; message: string };

export default function ProviderDetail({
  name,
  provider,
  onChange,
  onRename,
  onDelete,
  discovery,
  onDiscoverModels,
  onAcceptDiscoveredModels,
}: Props) {
  const [editingName, setEditingName] = useState(name);
  const { t } = useI18n();

  const canRename = editingName !== name && editingName.trim().length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <SectionTitle>{t.models.provider}</SectionTitle>
        <button
          onClick={() => onDelete(name)}
          className="cursor-pointer rounded border px-2 py-[3px] text-[11px]"
          style={{
            borderColor: "color-mix(in srgb, var(--destructive) 30%, transparent)",
            color: "var(--destructive)",
            background: "none",
          }}
          type="button"
        >
          {t.common.delete}
        </button>
      </div>

      {/* Provider name */}
      <Field label={t.models.providerName}>
        <input
          value={editingName}
          onChange={(e) => setEditingName(e.target.value)}
          className="font-ui-mono"
          style={{ ...inputStyle }}
        />
        {canRename && (
          <button
            onClick={() => onRename(name, editingName.trim())}
            className="mt-1 cursor-pointer self-start rounded border-none px-2.5 py-[3px] text-[11px] text-white"
            style={{ background: "var(--accent)" }}
          type="button"
        >
            {t.models.rename}
          </button>
        )}
      </Field>

      {/* Base URL */}
      <Field label={t.models.baseUrl}>
        <input
          value={provider.baseUrl ?? ""}
          onChange={(e) => onChange({ ...provider, baseUrl: e.target.value })}
          placeholder="https://api.example.com/v1"
          className="font-ui-mono"
          style={{ ...inputStyle }}
        />
      </Field>

      {/* API Key */}
      <Field label={t.models.apiKey}>
        <SecretTextInput
          value={provider.apiKey ?? ""}
          onChange={(v) => onChange({ ...provider, apiKey: v })}
          placeholder={t.models.apiKeyPlaceholder}
          mono
        />
      </Field>

      {/* AI API 协议 */}
      <Field label={t.models.api}>
        <select
          value={provider.api ?? ""}
          onChange={(e) => onChange({ ...provider, api: e.target.value })}
          required
          style={{
            ...inputStyle,
            color: provider.api ? "var(--text)" : "var(--text-dim)",
          }}
        >
          {API_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </Field>

      <ModelDiscoveryPanel
        providerName={name}
        provider={provider}
        discovery={discovery}
        onDiscoverModels={onDiscoverModels}
        onAcceptDiscoveredModels={onAcceptDiscoveredModels}
      />
    </div>
  );
}

function ModelDiscoveryPanel({
  providerName,
  provider,
  discovery,
  onDiscoverModels,
  onAcceptDiscoveredModels,
}: {
  providerName: string;
  provider: ProviderEntry;
  discovery: DiscoveryState;
  onDiscoverModels: (providerName: string) => void;
  onAcceptDiscoveredModels: (providerName: string) => void;
}) {
  const { t } = useI18n();
  const relevant =
    discovery.phase !== "idle" && discovery.providerName === providerName
      ? discovery
      : null;
  const discovering = relevant?.phase === "discovering";
  const suggestions = relevant?.phase === "result" ? relevant.models : [];
  const existingIds = new Set((provider.models ?? []).map((model) => model.id));
  const newCount = suggestions.filter(
    (suggestion) => !existingIds.has(suggestion.model.id),
  ).length;

  return (
    <section className="rounded-[8px] border border-line bg-panel p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <SectionTitle>{t.models.discoverModels}</SectionTitle>
          <p className="mt-1 text-[12px] leading-5 text-muted">
            {t.models.discoverModelsDescription}
          </p>
        </div>
        <button
          type="button"
          disabled={discovering}
          onClick={() => onDiscoverModels(providerName)}
          className="shrink-0 rounded border border-line px-2.5 py-[5px] text-[11px] text-muted hover:bg-hover disabled:cursor-not-allowed disabled:text-dim"
        >
          {discovering ? t.models.discoveringModels : t.models.discoverModels}
        </button>
      </div>

      {relevant?.phase === "error" && (
        <p className="mt-2 text-[12px] text-destructive">{relevant.message}</p>
      )}

      {relevant?.phase === "result" && (
        <div className="mt-3 space-y-2">
          {relevant.remoteError && (
            <p className="text-[12px] text-dim">
              {t.models.remoteDiscoveryFailed}: {relevant.remoteError}
            </p>
          )}
          {suggestions.length === 0 ? (
            <p className="text-[12px] text-dim">
              {t.models.noDiscoveredModels}
            </p>
          ) : (
            <>
              <div className="max-h-[168px] overflow-y-auto rounded border border-line">
                {suggestions.slice(0, 6).map((suggestion) => (
                  <div
                    key={suggestion.model.id}
                    className="flex items-center gap-2 border-b border-line px-2.5 py-2 last:border-b-0"
                  >
                    <span className="min-w-0 flex-1 truncate font-ui-mono text-[11px] text-primary">
                      {suggestion.model.id}
                    </span>
                    <span className="rounded-full border border-line px-1.5 py-0.5 text-[10px] text-dim">
                      {sourceLabel(suggestion, t)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12px] text-dim">
                  {newCount === 0
                    ? t.models.allDiscoveredModelsExist
                    : `${newCount} ${t.models.newModelsDiscovered}`}
                </span>
                <button
                  type="button"
                  disabled={newCount === 0}
                  onClick={() => onAcceptDiscoveredModels(providerName)}
                  className="rounded border border-line px-2.5 py-[5px] text-[11px] text-muted hover:bg-hover disabled:cursor-not-allowed disabled:text-dim"
                >
                  {t.models.addDiscovered}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function sourceLabel(
  suggestion: ModelDiscoverySuggestion,
  t: ReturnType<typeof useI18n>["t"],
) {
  if (suggestion.source === "catalog") return t.models.sourceCatalog;
  if (suggestion.source === "inferred") return t.models.sourceInferred;
  if (suggestion.source === "remote") return t.models.sourceRemote;
  return t.models.sourceDefaulted;
}

function SecretTextInput({
  value,
  onChange,
  placeholder,
  mono,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  const [userVisible, setUserVisible] = useState(false);
  const visible = userVisible && value !== "";

  return (
    <div className="relative w-full">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className={mono ? "font-ui-mono" : undefined}
        style={{ ...inputStyle, paddingRight: 34 }}
      />
      <button
        onClick={() => setUserVisible((v) => !v)}
        className="absolute top-1/2 right-[5px] flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center border-none bg-transparent p-0"
        style={{ color: "var(--text-dim)" }}
        type="button"
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.89 1 12a18.45 18.45 0 0 1 5.06-6.94" />
      <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c5 0 9.27 3.11 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88" />
      <path d="M1 1l22 22" />
    </svg>
  );
}
