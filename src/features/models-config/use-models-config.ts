"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadApiKeyProvider,
  loadModelsConfigData,
  saveModelsConfig,
} from "./api";
import { useI18n } from "@/i18n/use-i18n";
import type {
  ApiKeyProvider,
  ModelEntry,
  ModelsJson,
  OAuthProvider,
  ProviderEntry,
  Selection,
} from "./types";

const EMPTY_CONFIG: ModelsJson = { providers: {} };

export function useModelsConfig() {
  const { t } = useI18n();
  const [config, setConfig] = useState<ModelsJson>(EMPTY_CONFIG);
  const [oauthProviders, setOauthProviders] = useState<OAuthProvider[]>([]);
  const [apiKeyProviders, setApiKeyProviders] = useState<ApiKeyProvider[]>([]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  useEffect(() => {
    let active = true;
    loadModelsConfigData()
      .then((data) => {
        if (!active) return;
        setConfig(data.config);
        setOauthProviders(data.oauthProviders);
        setApiKeyProviders(data.apiKeyProviders);
        const firstProvider = Object.keys(data.config.providers ?? {})[0];
        setSelection(
          firstProvider ? { type: "provider", name: firstProvider } : null,
        );
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(toMessage(error, t.models.failedToLoadConfig));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [t.models.failedToLoadConfig]);

  const addCustomProvider = useCallback(() => {
    const name = getUniqueProviderName(config.providers ?? {});
    setConfig((current) => ({
      ...current,
      providers: {
        ...(current.providers ?? {}),
        [name]: { api: "openai-completions" },
      },
    }));
    setSelection({ type: "provider", name });
  }, [config.providers]);

  const renameProvider = useCallback(
    (oldName: string, requestedName: string) => {
      const newName = requestedName.trim();
      if (!newName || oldName === newName) return;
      if (config.providers?.[newName]) {
        setSaveError(`${t.models.providerExists}: "${newName}"`);
        return;
      }
      setSaveError(null);
      setConfig((current) => {
        const providers: Record<string, ProviderEntry> = {};
        for (const [name, provider] of Object.entries(
          current.providers ?? {},
        )) {
          providers[name === oldName ? newName : name] = provider;
        }
        return { ...current, providers };
      });
      setSelection((current) => {
        if (current?.type === "provider" && current.name === oldName) {
          return { type: "provider", name: newName };
        }
        if (current?.type === "model" && current.providerName === oldName) {
          return { ...current, providerName: newName };
        }
        return current;
      });
    },
    [config.providers, t.models.providerExists],
  );

  const deleteProvider = useCallback(
    (name: string) => {
      const providers = { ...(config.providers ?? {}) };
      delete providers[name];
      setConfig((current) => ({ ...current, providers }));
      const firstProvider = Object.keys(providers)[0];
      setSelection(
        firstProvider ? { type: "provider", name: firstProvider } : null,
      );
    },
    [config.providers],
  );

  const updateProvider = useCallback(
    (name: string, provider: ProviderEntry) => {
      setConfig((current) => ({
        ...current,
        providers: { ...(current.providers ?? {}), [name]: provider },
      }));
    },
    [],
  );

  const addModel = useCallback(
    (providerName: string) => {
      const index = config.providers?.[providerName]?.models?.length ?? 0;
      setConfig((current) => {
        const provider = current.providers?.[providerName];
        if (!provider) return current;
        return {
          ...current,
          providers: {
            ...(current.providers ?? {}),
            [providerName]: {
              ...provider,
              models: [...(provider.models ?? []), { id: "" }],
            },
          },
        };
      });
      setSelection({ type: "model", providerName, index });
    },
    [config.providers],
  );

  const updateModel = useCallback(
    (providerName: string, index: number, model: ModelEntry) => {
      setConfig((current) => {
        const provider = current.providers?.[providerName];
        if (!provider) return current;
        const models = [...(provider.models ?? [])];
        models[index] = model;
        return {
          ...current,
          providers: {
            ...(current.providers ?? {}),
            [providerName]: { ...provider, models },
          },
        };
      });
    },
    [],
  );

  const removeModel = useCallback((providerName: string, index: number) => {
    setConfig((current) => {
      const provider = current.providers?.[providerName];
      if (!provider) return current;
      const models = [...(provider.models ?? [])];
      models.splice(index, 1);
      return {
        ...current,
        providers: {
          ...(current.providers ?? {}),
          [providerName]: {
            ...provider,
            models: models.length ? models : undefined,
          },
        },
      };
    });
    setSelection({ type: "provider", name: providerName });
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await saveModelsConfig(config);
      setSavedOk(true);
      window.setTimeout(() => setSavedOk(false), 2_000);
    } catch (error) {
      setSaveError(toMessage(error, t.models.failedToSave));
    } finally {
      setSaving(false);
    }
  }, [config, t.models.failedToSave]);

  const refreshApiKeyProvider = useCallback(
    async (providerId: string) => {
      const current = apiKeyProviders.find(
        (provider) => provider.id === providerId,
      );
      if (!current) return;
      const updated = await loadApiKeyProvider(current, current.modelCount);
      setApiKeyProviders((providers) =>
        providers.map((provider) =>
          provider.id === providerId ? updated : provider,
        ),
      );
    },
    [apiKeyProviders],
  );

  return {
    config,
    oauthProviders,
    apiKeyProviders,
    selection,
    setSelection,
    loading,
    loadError,
    saving,
    saveError,
    savedOk,
    addCustomProvider,
    renameProvider,
    deleteProvider,
    updateProvider,
    addModel,
    updateModel,
    removeModel,
    save,
    refreshApiKeyProvider,
  };
}

function getUniqueProviderName(providers: Record<string, ProviderEntry>) {
  let name = "new-provider";
  let suffix = 1;
  while (name in providers) {
    name = `new-provider-${suffix}`;
    suffix += 1;
  }
  return name;
}

function toMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
