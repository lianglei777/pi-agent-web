"use client";

import { useEffect, useRef, useState } from "react";
import {
  API_OPTIONS,
  type ModelDiscoverySuggestion,
  type ProviderEntry,
} from "../types";
import { useI18n } from "@/i18n/use-i18n";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SectionTitle, Field, inputStyle } from "../shared/form-ui";
import { CompatEditor } from "./compat-editor";
import { changeEntryApi } from "./compat-editor-state";

interface Props {
  name: string;
  provider: ProviderEntry;
  onChange: (p: ProviderEntry) => void;
  onRename: (oldName: string, newName: string) => void;
  onDelete: (name: string) => void;
  discovery: DiscoveryState;
  onDiscoverModels: (providerName: string) => void;
  onAcceptDiscoveredModels: (
    providerName: string,
    selected: ModelDiscoverySuggestion[],
  ) => void;
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
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { t } = useI18n();

  const canRename = editingName !== name && editingName.trim().length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <SectionTitle>{t.models.provider}</SectionTitle>
        <Button
          onClick={() => setConfirmingDelete(true)}
          size="sm"
          type="button"
          variant="destructive"
        >
          {t.common.delete}
        </Button>
      </div>

      <Dialog
        open={confirmingDelete}
        onOpenChange={(open) => !open && setConfirmingDelete(false)}
      >
        <DialogContent
          className="z-[1101] sm:max-w-[420px]"
          closeLabel={t.common.close}
          overlayClassName="z-[1100]"
        >
          <DialogHeader>
            <DialogTitle>{t.models.deleteProviderTitle}</DialogTitle>
            <DialogDescription>
              {t.models.deleteProviderDescription.replace("{provider}", name)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              autoFocus
              onClick={() => setConfirmingDelete(false)}
              type="button"
              variant="outline"
            >
              {t.common.cancel}
            </Button>
            <Button
              onClick={() => {
                setConfirmingDelete(false);
                onDelete(name);
              }}
              type="button"
              variant="destructive"
            >
              {t.models.deleteProviderAction}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Provider name */}
      <Field label={t.models.providerName}>
        <input
          value={editingName}
          onChange={(e) => setEditingName(e.target.value)}
          className="font-ui-mono"
          style={{ ...inputStyle }}
        />
        {canRename && (
          <Button
            className="mt-1 self-start"
            onClick={() => onRename(name, editingName.trim())}
            size="sm"
            type="button"
          >
            {t.models.rename}
          </Button>
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
      <Field label={t.models.apiProtocol}>
        <select
          value={provider.api ?? ""}
          onChange={(e) => onChange(changeEntryApi(provider, e.target.value))}
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

      <CompatEditor
        api={provider.api}
        compat={provider.compat}
        onChange={(compat) => onChange({ ...provider, compat })}
      />

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
  onAcceptDiscoveredModels: (
    providerName: string,
    selected: ModelDiscoverySuggestion[],
  ) => void;
}) {
  const { t } = useI18n();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const relevant =
    discovery.phase !== "idle" && discovery.providerName === providerName
      ? discovery
      : null;
  const discovering = relevant?.phase === "discovering";
  const resultModels = relevant?.phase === "result" ? relevant.models : null;

  // 发现结果变化时重置选择（默认不选）
  const lastResultRef = useRef(resultModels);
  useEffect(() => {
    if (lastResultRef.current !== resultModels) {
      lastResultRef.current = resultModels;
      setSelectedIds(new Set());
    }
  }, [resultModels]);

  const existingIds = new Set((provider.models ?? []).map((model) => model.id));
  const newSuggestions = resultModels
    ? resultModels.filter((suggestion) => !existingIds.has(suggestion.model.id))
    : [];
  const existingHiddenCount = resultModels
    ? resultModels.length - newSuggestions.length
    : 0;
  const selectedSuggestions = newSuggestions.filter((suggestion) =>
    selectedIds.has(suggestion.model.id),
  );
  const allSelected =
    newSuggestions.length > 0 &&
    newSuggestions.every((suggestion) =>
      selectedIds.has(suggestion.model.id),
    );

  const toggleModel = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(
        new Set(newSuggestions.map((suggestion) => suggestion.model.id)),
      );
    }
  };

  return (
    <section className="rounded-[8px] border border-line bg-panel p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <SectionTitle>{t.models.discoverModels}</SectionTitle>
          <p className="mt-1 text-[12px] leading-5 text-muted">
            {t.models.discoverModelsDescription}
          </p>
        </div>
        <Button
          className="shrink-0 text-muted"
          disabled={discovering}
          onClick={() => onDiscoverModels(providerName)}
          size="sm"
          type="button"
          variant="outline"
        >
          {discovering ? t.models.discoveringModels : t.models.discoverModels}
        </Button>
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
          {newSuggestions.length === 0 ? (
            <p className="text-[12px] text-dim">
              {existingHiddenCount > 0
                ? t.models.allDiscoveredModelsExist
                : t.models.noDiscoveredModels}
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12px] text-dim">
                  {t.models.selectedCount} {selectedSuggestions.length} /{" "}
                  {newSuggestions.length}
                </span>
                <Button
                  className="text-muted"
                  onClick={toggleAll}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {allSelected
                    ? t.models.clearSelection
                    : t.models.selectDiscovered}
                </Button>
              </div>
              <div className="max-h-[168px] overflow-y-auto rounded border border-line">
                {newSuggestions.map((suggestion) => {
                  const checked = selectedIds.has(suggestion.model.id);
                  return (
                    <label
                      key={suggestion.model.id}
                      className="flex cursor-pointer items-center gap-2 border-b border-line px-2.5 py-2 last:border-b-0 hover:bg-hover"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleModel(suggestion.model.id)}
                        className="h-[13px] w-[13px] cursor-pointer"
                        style={{ accentColor: "var(--accent)" }}
                      />
                      <span className="min-w-0 flex-1 truncate font-ui-mono text-[11px] text-primary">
                        {suggestion.model.id}
                      </span>
                      {suggestion.source !== "inferred" && (
                        <span className="rounded-full border border-line px-1.5 py-0.5 text-[10px] text-dim">
                          {sourceLabel(suggestion, t)}
                        </span>
                      )}
                      <span className="rounded-full border border-line px-1.5 py-0.5 text-[10px] text-dim">
                        {t.models.unverified}
                      </span>
                    </label>
                  );
                })}
              </div>
              {existingHiddenCount > 0 && (
                <p className="text-[11px] text-dim">
                  {existingHiddenCount} {t.models.existingHidden}
                </p>
              )}
              <div className="flex items-center justify-end gap-3">
                <Button
                  className="text-muted"
                  disabled={selectedSuggestions.length === 0}
                  onClick={() => {
                    onAcceptDiscoveredModels(providerName, selectedSuggestions);
                    setSelectedIds(new Set());
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {t.models.addSelected} ({selectedSuggestions.length})
                </Button>
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
  const { t } = useI18n();

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
      <Button
        aria-label={visible ? t.models.hideApiKey : t.models.showApiKey}
        className="absolute top-1/2 right-[5px] size-6 -translate-y-1/2 text-dim"
        onClick={() => setUserVisible((v) => !v)}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </Button>
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
