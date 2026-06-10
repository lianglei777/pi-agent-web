"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  type ModelsJson,
  type ProviderEntry,
  type ModelEntry,
  type Selection,
  type OAuthProvider,
  type ApiKeyProvider,
} from "./types";
import ProviderDetail from "./provider-detail";
import ModelDetail from "./model-detail";
import OAuthDetail from "./oauth-detail";
import ApiKeyDetail from "./api-key-detail";
import { ProviderIcon } from "./provider-icon";

// ── Props ───────────────────────────────────────────────────────────────────

interface ModelsConfigDialogProps {
  onClose: () => void;
}

// ── Main Component ──────────────────────────────────────────────────────────

export function ModelsConfigDialog({
  onClose,
}: ModelsConfigDialogProps) {
  const [config, setConfig] = useState<ModelsJson>({ providers: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [oauthProviders, setOauthProviders] = useState<OAuthProvider[]>([]);
  const [apiKeyProviders, setApiKeyProviders] = useState<ApiKeyProvider[]>(
    [],
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  // Load config on mount
  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      try {
        const configRes = await fetch("/api/models-config");
        const oauthRes = await fetch("/api/auth/providers");
        const apiKeyRes = await fetch("/api/auth/all-providers");

        if (cancelled) return;

        const configData = await configRes.json();
        const normalized: ModelsJson =
          configData.config ?? configData ?? { providers: {} };
        setConfig(normalized);
        const names = Object.keys(normalized.providers ?? {});
        if (names.length > 0) {
          setSelection({ type: "provider", name: names[0] });
        }

        const oauthData = await oauthRes.json();
        setOauthProviders(oauthData.providers ?? []);

        const apiKeyData = await apiKeyRes.json();
        setApiKeyProviders(apiKeyData.providers ?? []);
      } catch {
        if (!cancelled) {
          setConfig({ providers: {} });
          setOauthProviders([]);
          setApiKeyProviders([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAll();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Provider management ──────────────────────────────────────────────────

  const addCustomProvider = useCallback(() => {
    setConfig((prev) => {
      const providers = { ...(prev.providers ?? {}) };
      let newName = "new-provider";
      let i = 1;
      while (newName in providers) {
        newName = `new-provider-${i}`;
        i++;
      }
      providers[newName] = { api: "openai-completions" };
      return { ...prev, providers };
    });
    setSelection({ type: "provider", name: getUniqueProviderName(config.providers ?? {}) });
  }, [config.providers]);

  const renameProvider = useCallback(
    (oldName: string, newName: string) => {
      if (!newName.trim() || oldName === newName) return;
      setConfig((prev) => {
        const providers: Record<string, ProviderEntry> = {};
        for (const [k, v] of Object.entries(prev.providers ?? {})) {
          if (k === oldName) {
            providers[newName.trim()] = v;
          } else {
            providers[k] = v;
          }
        }
        return { ...prev, providers };
      });
      setSelection((sel) => {
        if (sel?.type === "provider" && sel.name === oldName) {
          return { type: "provider", name: newName.trim() };
        }
        if (
          sel?.type === "model" &&
          sel.providerName === oldName
        ) {
          return {
            type: "model",
            providerName: newName.trim(),
            index: sel.index,
          };
        }
        return sel;
      });
    },
    [],
  );

  const deleteProvider = useCallback((name: string) => {
    setConfig((prev) => {
      const providers = { ...(prev.providers ?? {}) };
      delete providers[name];
      const remaining = Object.keys(providers);
      setSelection(
        remaining.length > 0
          ? { type: "provider", name: remaining[0] }
          : null,
      );
      return { ...prev, providers };
    });
  }, []);

  const updateProvider = useCallback(
    (name: string, p: ProviderEntry) => {
      setConfig((prev) => ({
        ...prev,
        providers: { ...(prev.providers ?? {}), [name]: p },
      }));
    },
    [],
  );

  // ── Model management ─────────────────────────────────────────────────────

  const addModel = useCallback((providerName: string) => {
    setConfig((prev) => {
      const p = prev.providers?.[providerName];
      if (!p) return prev;
      const models: ModelEntry[] = [...(p.models ?? []), { id: "" }];
      return {
        ...prev,
        providers: {
          ...(prev.providers ?? {}),
          [providerName]: { ...p, models },
        },
      };
    });
    const p = config.providers?.[providerName];
    const modelCount = p?.models?.length ?? 0;
    setSelection({
      type: "model",
      providerName,
      index: modelCount,
    });
  }, [config.providers]);

  const updateModel = useCallback(
    (providerName: string, index: number, m: ModelEntry) => {
      setConfig((prev) => {
        const p = prev.providers?.[providerName];
        if (!p) return prev;
        const models = [...(p.models ?? [])];
        models[index] = m;
        return {
          ...prev,
          providers: {
            ...(prev.providers ?? {}),
            [providerName]: { ...p, models },
          },
        };
      });
    },
    [],
  );

  const removeModel = useCallback(
    (providerName: string, index: number) => {
      setConfig((prev) => {
        const p = prev.providers?.[providerName];
        if (!p) return prev;
        const models = [...(p.models ?? [])];
        models.splice(index, 1);
        return {
          ...prev,
          providers: {
            ...(prev.providers ?? {}),
            [providerName]: {
              ...p,
              models: models.length ? models : undefined,
            },
          },
        };
      });
      setSelection({ type: "provider", name: providerName });
    },
    [],
  );

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/models-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const d = await res.json();
      if (!res.ok || d.error) {
        setSaveError(d.error ?? "Failed to save");
      } else {
        setSavedOk(true);
        setTimeout(() => setSavedOk(false), 2000);
      }
    } catch {
      setSaveError("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  // ── Selection helpers ────────────────────────────────────────────────────

  const providers = Object.entries(config.providers ?? {});
  const activeOAuth = oauthProviders.filter((p) => p.loggedIn);
  const activeApiKey = apiKeyProviders.filter((p) => p.configured);

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <ModalOverlay onClose={onClose}>
        <div className="flex h-[78vh] w-[860px] items-center justify-center rounded-[10px] border border-line bg-canvas">
          <span className="text-[13px] text-dim">Loading…</span>
        </div>
      </ModalOverlay>
    );
  }

  return (
    <>
      <ModalOverlay onClose={onClose}>
        <div
          className="relative flex flex-col overflow-hidden rounded-[10px] border border-line bg-canvas"
          style={{
            width: 860,
            height: "78vh",
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          }}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-line px-[18px] py-3">
            <div className="flex items-baseline gap-2.5">
              <span className="text-[15px] font-bold text-primary">
                Models
              </span>
              <code className="font-ui-mono text-[11px] text-muted">
                ~/.pi/agent/models.json
              </code>
            </div>
            <button
              onClick={onClose}
              className="cursor-pointer border-none bg-transparent px-1.5 py-0.5 text-[20px] leading-none"
              style={{ color: "var(--text-muted)" }}
              type="button"
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left panel */}
            <div
              className="flex shrink-0 flex-col border-r border-line bg-panel"
              style={{ width: 210 }}
            >
              <div className="flex-1 overflow-y-auto px-1.5 py-2">
                {/* OAuth providers */}
                {activeOAuth.map((p) => (
                  <NavRow
                    key={p.id}
                    selected={
                      selection?.type === "oauth" &&
                      selection.providerId === p.id
                    }
                    onClick={() =>
                      setSelection({
                        type: "oauth",
                        providerId: p.id,
                      })
                    }
                  >
                    <ProviderIcon id={p.id} size={16} />
                    <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[12px] text-primary">
                      {p.name}
                    </span>
                  </NavRow>
                ))}

                {/* API Key providers */}
                {activeApiKey.map((p) => (
                  <NavRow
                    key={p.id}
                    selected={
                      selection?.type === "apikey" &&
                      selection.providerId === p.id
                    }
                    onClick={() =>
                      setSelection({
                        type: "apikey",
                        providerId: p.id,
                      })
                    }
                  >
                    <ProviderIcon id={p.id} size={16} />
                    <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[12px] text-primary">
                      {p.displayName}
                    </span>
                  </NavRow>
                ))}

                {/* Divider */}
                {(activeOAuth.length > 0 || activeApiKey.length > 0) &&
                  providers.length > 0 && (
                    <div className="mx-2 my-1 border-t border-line" />
                  )}

                {/* Custom providers tree */}
                {providers.map(([pName, p]) => {
                  const isProviderSelected =
                    selection?.type === "provider" &&
                    selection.name === pName;
                  return (
                    <div key={pName} className="mb-0.5">
                      {/* Provider row */}
                      <div
                        onClick={() =>
                          setSelection({
                            type: "provider",
                            name: pName,
                          })
                        }
                        className="flex cursor-pointer items-center gap-1.5 rounded-[5px] px-2 py-[7px]"
                        style={{
                          background: isProviderSelected
                            ? "var(--bg-selected)"
                            : "none",
                        }}
                        onMouseEnter={(e) => {
                          if (!isProviderSelected) {
                            e.currentTarget.style.background =
                              "var(--bg-hover)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isProviderSelected) {
                            e.currentTarget.style.background =
                              "none";
                          }
                        }}
                      >
                        <ServerIcon />
                        <span
                          className="font-ui-mono text-[12px] text-primary"
                          style={{
                            fontWeight: isProviderSelected
                              ? 600
                              : 400,
                          }}
                        >
                          {pName}
                        </span>
                      </div>

                      {/* Model rows */}
                      {p.models?.map((m, i) => {
                        const isModelSelected =
                          selection?.type === "model" &&
                          selection.providerName === pName &&
                          selection.index === i;
                        return (
                          <div
                            key={i}
                            onClick={() =>
                              setSelection({
                                type: "model",
                                providerName: pName,
                                index: i,
                              })
                            }
                            className="flex cursor-pointer items-center gap-1 rounded-[5px] py-[5px] pr-2 pl-[26px]"
                            style={{
                              background: isModelSelected
                                ? "var(--bg-selected)"
                                : "none",
                            }}
                            onMouseEnter={(e) => {
                              if (!isModelSelected) {
                                e.currentTarget.style.background =
                                  "var(--bg-hover)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isModelSelected) {
                                e.currentTarget.style.background =
                                  "none";
                              }
                            }}
                          >
                            <span
                              className="font-ui-mono text-[11px]"
                              style={{
                                color: m.id
                                  ? "var(--text-muted)"
                                  : "var(--text-dim)",
                              }}
                            >
                              {m.id || "new model"}
                            </span>
                            {m.reasoning && (
                              <span
                                className="shrink-0 rounded-[3px] px-1 text-[9px]"
                                style={{
                                  background:
                                    "rgba(99,102,241,0.12)",
                                  color:
                                    "rgba(99,102,241,0.8)",
                                }}
                              >
                                T
                              </span>
                            )}
                          </div>
                        );
                      })}

                      {/* + model button */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          addModel(pName);
                        }}
                        className="cursor-pointer rounded-[5px] py-1 pr-2 pl-[26px]"
                        style={{ color: "var(--text-dim)" }}
                      >
                        <span className="text-[11px]">+ model</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* + Add provider button */}
              <div className="border-t border-line px-1.5 py-2">
                <button
                  onClick={() => setPickerOpen(true)}
                  className="flex w-full cursor-pointer items-center justify-center gap-[5px] rounded-[5px] border border-dashed border-line bg-transparent py-1.5 text-[12px] transition-[border-color,color] duration-150"
                  style={{ color: "var(--text-muted)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor =
                      "var(--accent)";
                    e.currentTarget.style.color = "var(--accent)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor =
                      "var(--border)";
                    e.currentTarget.style.color =
                      "var(--text-muted)";
                  }}
                  type="button"
                >
                  + Add provider
                </button>
              </div>
            </div>

            {/* Right panel */}
            <div className="flex-1 overflow-y-auto p-5">
              {renderDetail()}
            </div>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-line px-[18px] py-2.5">
            {saveError && (
              <span className="flex-1 text-[12px]" style={{ color: "#f87171" }}>
                {saveError}
              </span>
            )}
            <button
              onClick={onClose}
              className="cursor-pointer rounded-md border border-line bg-transparent px-3.5 py-1.5 text-[13px]"
              style={{ color: "var(--text-muted)" }}
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || savedOk}
              className="relative flex min-w-[92px] items-center justify-center gap-1.5 rounded-md border-none px-4 py-1.5 text-[13px] font-semibold text-white transition-[background-color,color] duration-200"
              style={{
                background: savedOk
                  ? "#16a34a"
                  : saving
                    ? "var(--bg-panel)"
                    : "var(--accent)",
                color: savedOk
                  ? "#fff"
                  : saving
                    ? "var(--text-muted)"
                    : "#fff",
                cursor:
                  saving || savedOk ? "default" : "pointer",
                animation: savedOk
                  ? "saved-pop 0.45s ease"
                  : undefined,
              }}
              type="button"
            >
              {savedOk && (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                  style={{
                    strokeDasharray: 18,
                    animation:
                      "saved-check-draw 0.35s ease forwards",
                  }}
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              <span>
                {savedOk ? "Saved" : saving ? "Saving…" : "Save"}
              </span>
            </button>
          </div>
        </div>
      </ModalOverlay>

      {/* AddProviderPicker */}
      {pickerOpen && (
        <AddProviderPicker
          oauthProviders={oauthProviders}
          apiKeyProviders={apiKeyProviders}
          onSelectOAuth={(id) => {
            setSelection({ type: "oauth", providerId: id });
            setPickerOpen(false);
          }}
          onSelectApiKey={(id) => {
            setSelection({ type: "apikey", providerId: id });
            setPickerOpen(false);
          }}
          onAddCustom={() => {
            addCustomProvider();
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  );

  function renderDetail() {
    if (!selection) {
      return (
        <div className="flex h-full items-center justify-center text-[13px] text-dim">
          Select a provider or model
        </div>
      );
    }

    switch (selection.type) {
      case "provider": {
        const p = config.providers?.[selection.name];
        if (!p) return null;
        return (
          <ProviderDetail
            key={selection.name}
            name={selection.name}
            provider={p}
            onChange={(next) => updateProvider(selection.name, next)}
            onRename={renameProvider}
            onDelete={deleteProvider}
          />
        );
      }
      case "model": {
        const p = config.providers?.[selection.providerName];
        const m = p?.models?.[selection.index];
        if (!m) return null;
        return (
          <ModelDetail
            key={`${selection.providerName}-${selection.index}`}
            providerName={selection.providerName}
            provider={p}
            model={m}
            onChange={(next) =>
              updateModel(selection.providerName, selection.index, next)
            }
            onDelete={() =>
              removeModel(selection.providerName, selection.index)
            }
          />
        );
      }
      case "oauth": {
        const op = oauthProviders.find(
          (p) => p.id === selection.providerId,
        );
        if (!op) return null;
        return (
          <OAuthDetail
            key={op.id}
            provider={op}
            onRefresh={async () => {
              try {
                const res = await fetch("/api/auth/providers");
                const d = await res.json();
                setOauthProviders(d.providers ?? []);
              } catch {
                setOauthProviders([]);
              }
            }}
          />
        );
      }
      case "apikey": {
        const ap = apiKeyProviders.find(
          (p) => p.id === selection.providerId,
        );
        if (!ap) return null;
        return (
          <ApiKeyDetail
            key={ap.id}
            provider={ap}
            onRefresh={async () => {
              try {
                const res = await fetch("/api/auth/all-providers");
                const d = await res.json();
                setApiKeyProviders(d.providers ?? []);
              } catch {
                setApiKeyProviders([]);
              }
            }}
          />
        );
      }
    }
  }
}

// ── Utility ─────────────────────────────────────────────────────────────────

function getUniqueProviderName(
  providers: Record<string, ProviderEntry>,
): string {
  let name = "new-provider";
  let i = 1;
  while (name in providers) {
    name = `new-provider-${i}`;
    i++;
  }
  return name;
}

// ── Modal Overlay ───────────────────────────────────────────────────────────

function ModalOverlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.35)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

// ── Nav Row ─────────────────────────────────────────────────────────────────

function NavRow({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      className="flex cursor-pointer items-center gap-[7px] rounded-[5px] px-2 py-[5px]"
      style={{
        background: selected ? "var(--bg-selected)" : "none",
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.background = "var(--bg-hover)";
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.background = "none";
        }
      }}
    >
      {children}
    </div>
  );
}

// ── Server Icon ─────────────────────────────────────────────────────────────

function ServerIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: "var(--text-dim)", flexShrink: 0 }}
    >
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="14" x2="23" y2="14" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="14" x2="4" y2="14" />
    </svg>
  );
}

// ── AddProviderPicker ───────────────────────────────────────────────────────

interface AddProviderPickerProps {
  oauthProviders: OAuthProvider[];
  apiKeyProviders: ApiKeyProvider[];
  onSelectOAuth: (id: string) => void;
  onSelectApiKey: (id: string) => void;
  onAddCustom: () => void;
  onClose: () => void;
}

function AddProviderPicker({
  oauthProviders,
  apiKeyProviders,
  onSelectOAuth,
  onSelectApiKey,
  onAddCustom,
  onClose,
}: AddProviderPickerProps) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, []);

  const q = search.trim().toLowerCase();

  const availableOAuth = oauthProviders.filter(
    (p) => !p.loggedIn && (!q || p.name.toLowerCase().includes(q)),
  );

  const availableApiKey = apiKeyProviders.filter(
    (p) =>
      !p.configured &&
      (!q ||
        p.displayName.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)),
  );

  const showCustom =
    !q ||
    "custom".includes(q) ||
    "openai-compatible".includes(q) ||
    "anthropic-compatible".includes(q);

  const hasResults =
    showCustom || availableOAuth.length > 0 || availableApiKey.length > 0;

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative flex flex-col overflow-hidden rounded-[10px] border border-line bg-canvas"
        style={{
          width: 820,
          maxWidth: "calc(100vw - 32px)",
          maxHeight: "min(72vh, calc(100vh - 32px))",
          boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
        }}
      >
        {/* Search bar */}
        <div className="flex shrink-0 items-center gap-2 border-b border-line px-3.5 py-2.5">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            style={{ color: "var(--text-dim)", flexShrink: 0 }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
            }}
            placeholder="Search providers…"
            className="flex-1 border-none bg-transparent text-[13px] outline-none"
            style={{ color: "var(--text)", boxSizing: "border-box" }}
          />
        </div>

        {/* Cards grid */}
        <div className="flex-1 overflow-y-auto p-3.5">
          {!hasResults ? (
            <div className="flex h-full items-center justify-center text-[12px] text-dim">
              No providers match
            </div>
          ) : (
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(240px, 100%), 1fr))",
              }}
            >
              {/* Custom */}
              {showCustom && (
                <>
                  <CategoryTitle>Custom</CategoryTitle>
                  <PickerCard onClick={onAddCustom}>
                    <div className="min-w-0 flex-1">
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[12px] font-semibold leading-tight text-primary">
                        OpenAI / Anthropic compatible
                      </div>
                      <div className="mt-0.5 text-[10px] text-dim">
                        Custom endpoint format
                      </div>
                    </div>
                    <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[5px] border border-dashed border-line"
                      style={{ background: "var(--bg-hover)" }}
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </span>
                  </PickerCard>
                </>
              )}

              {/* Subscriptions (OAuth) */}
              {availableOAuth.length > 0 && (
                <>
                  <CategoryTitle first={!showCustom}>
                    Subscriptions
                  </CategoryTitle>
                  {availableOAuth.map((p) => (
                    <PickerCard
                      key={p.id}
                      onClick={() => onSelectOAuth(p.id)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[12px] font-semibold leading-tight text-primary"
                        >
                          {p.name}
                        </div>
                        <div className="mt-0.5 text-[10px] text-dim">
                          OAuth
                        </div>
                      </div>
                      <ProviderIcon id={p.id} size={28} />
                    </PickerCard>
                  ))}
                </>
              )}

              {/* API Key */}
              {availableApiKey.length > 0 && (
                <>
                  <CategoryTitle
                    first={!showCustom && availableOAuth.length === 0}
                  >
                    API Key
                  </CategoryTitle>
                  {availableApiKey.map((p) => (
                    <PickerCard
                      key={p.id}
                      onClick={() => onSelectApiKey(p.id)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[12px] font-semibold leading-tight text-primary"
                        >
                          {p.displayName}
                        </div>
                        <div className="mt-0.5 text-[10px] text-dim">
                          {p.modelCount} model
                          {p.modelCount === 1 ? "" : "s"}
                        </div>
                      </div>
                      <ProviderIcon id={p.id} size={28} />
                    </PickerCard>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── PickerCard ──────────────────────────────────────────────────────────────

function PickerCard({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex cursor-pointer flex-row items-center gap-2 rounded-[7px] border border-line bg-panel px-3 py-2.5 text-left transition-[border-color,background] duration-150"
      style={{ minWidth: 0, width: "100%", boxSizing: "border-box" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--accent)";
        e.currentTarget.style.background = "var(--bg-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.background = "var(--bg-panel)";
      }}
      type="button"
    >
      {children}
    </button>
  );
}

// ── CategoryTitle ───────────────────────────────────────────────────────────

function CategoryTitle({
  children,
  first,
}: {
  children: React.ReactNode;
  first?: boolean;
}) {
  return (
    <div
      className="col-span-full text-[10px] font-semibold uppercase tracking-[0.07em] text-dim"
      style={{ paddingTop: first ? 0 : 6 }}
    >
      {children}
    </div>
  );
}
