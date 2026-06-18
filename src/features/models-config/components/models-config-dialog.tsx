"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/i18n/use-i18n";
import ApiKeyDetail from "../details/api-key-detail";
import { ModalOverlay } from "./modal-overlay";
import ModelDetail from "../details/model-detail";
import { ModelsConfigSidebar } from "../sidebar/models-config-sidebar";
import OAuthDetail from "../details/oauth-detail";
import ProviderDetail from "../details/provider-detail";
import { useModelsConfig } from "../hooks/use-models-config";
import { resolveDialogClose } from "../dialog-safety";

export function ModelsConfigDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved?: () => void;
}) {
  const modelConfig = useModelsConfig(onSaved);
  const { t } = useI18n();
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  function requestClose() {
    const decision = resolveDialogClose({
      source: "explicit",
      dirty: modelConfig.dirty,
    });
    if (decision === "close") onClose();
    if (decision === "confirm-discard") setConfirmingDiscard(true);
  }

  return (
    <>
      <ModalOverlay label={t.models.configuration}>
        <div className="flex h-[78vh] w-[min(860px,calc(100vw-32px))] flex-col overflow-hidden rounded-[10px] border border-line bg-canvas shadow-2xl">
          <header className="flex shrink-0 items-center justify-between border-b border-line px-[18px] py-3">
            <div className="flex items-baseline gap-2.5">
              <span className="text-[15px] font-bold text-primary">
                {t.models.title}
              </span>
              <code className="font-ui-mono text-[11px] text-muted">
                ~/.pi/agent/models.json
              </code>
            </div>
            <button
              type="button"
              onClick={requestClose}
              aria-label={t.models.closeConfiguration}
              className="px-1.5 py-0.5 text-[20px] leading-none text-muted"
            >
              &times;
            </button>
          </header>

          {modelConfig.loading ? (
            <div className="flex flex-1 items-center justify-center text-[13px] text-dim">
              {t.common.loading}
            </div>
          ) : (
            <div className="flex min-h-0 flex-1">
              <ModelsConfigSidebar
                config={modelConfig.config}
                apiKeyProviders={modelConfig.apiKeyProviders}
                selection={modelConfig.selection}
                onSelect={modelConfig.setSelection}
                onAddProvider={modelConfig.addCustomProvider}
                onAddModel={modelConfig.addModel}
              />
              <main className="flex-1 overflow-y-auto p-5">
                {modelConfig.loadError ? (
                  <p className="text-[13px] text-red-400">
                    {modelConfig.loadError}
                  </p>
                ) : (
                  <ModelsConfigDetail modelConfig={modelConfig} />
                )}
              </main>
            </div>
          )}

          <footer className="flex shrink-0 items-center justify-end gap-2.5 border-t border-line px-[18px] py-2.5">
            {modelConfig.saveError && (
              <span className="flex-1 text-[12px] text-red-400">
                {modelConfig.saveError}
              </span>
            )}
            <Button
              type="button"
              onClick={requestClose}
              variant="outline"
              size="sm"
              className="text-[13px]"
            >
              {t.common.cancel}
            </Button>
            <Button
              type="button"
              onClick={modelConfig.save}
              disabled={
                modelConfig.loading ||
                !!modelConfig.loadError ||
                modelConfig.saving ||
                modelConfig.savedOk
              }
              size="sm"
              className="min-w-[92px] text-[13px] font-semibold"
              style={{ color: "var(--primary-foreground)" }}
            >
              {modelConfig.savedOk
                ? t.common.saved
                : modelConfig.saving
                  ? t.common.saving
                  : t.common.save}
            </Button>
          </footer>
        </div>
      </ModalOverlay>
      <Dialog open={confirmingDiscard}>
        <DialogContent
          className="z-[1201] sm:max-w-[420px]"
          closeLabel={t.common.close}
          overlayClassName="z-[1200]"
        >
          <DialogHeader>
            <DialogTitle>{t.models.discardChangesTitle}</DialogTitle>
            <DialogDescription>
              {t.models.discardChangesDescription}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              autoFocus
              onClick={() => setConfirmingDiscard(false)}
              type="button"
              variant="outline"
            >
              {t.models.continueEditing}
            </Button>
            <Button onClick={onClose} type="button" variant="destructive">
              {t.models.discardChanges}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ModelsConfigDetail({
  modelConfig,
}: {
  modelConfig: ReturnType<typeof useModelsConfig>;
}) {
  const selection = modelConfig.selection;
  if (!selection) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-dim">
        <EmptySelection />
      </div>
    );
  }

  if (selection.type === "provider") {
    const provider = modelConfig.config.providers?.[selection.name];
    return provider ? (
      <ProviderDetail
        key={selection.name}
        name={selection.name}
        provider={provider}
        onChange={(next) =>
          modelConfig.updateProvider(selection.name, next)
        }
        onRename={modelConfig.renameProvider}
        onDelete={modelConfig.deleteProvider}
        discovery={modelConfig.discovery}
        onDiscoverModels={modelConfig.discoverProviderModels}
        onAcceptDiscoveredModels={modelConfig.acceptDiscoveredModels}
      />
    ) : null;
  }

  if (selection.type === "model") {
    const provider =
      modelConfig.config.providers?.[selection.providerName];
    const model = provider?.models?.[selection.index];
    return provider && model ? (
      <ModelDetail
        key={`${selection.providerName}-${selection.index}`}
        config={modelConfig.config}
        providerName={selection.providerName}
        model={model}
        onChange={(next) =>
          modelConfig.updateModel(
            selection.providerName,
            selection.index,
            next,
          )
        }
        onDelete={() =>
          modelConfig.removeModel(
            selection.providerName,
            selection.index,
          )
        }
      />
    ) : null;
  }

  if (selection.type === "oauth") {
    const provider = modelConfig.oauthProviders.find(
      (candidate) => candidate.id === selection.providerId,
    );
    return provider ? <OAuthDetail key={provider.id} provider={provider} /> : null;
  }

  const provider = modelConfig.apiKeyProviders.find(
    (candidate) => candidate.id === selection.providerId,
  );
  return provider ? (
    <ApiKeyDetail
      key={provider.id}
      provider={provider}
      onRefresh={() => modelConfig.refreshApiKeyProvider(provider.id)}
    />
  ) : null;
}

function EmptySelection() {
  const { t } = useI18n();
  return <>{t.models.selectProviderOrModel}</>;
}
