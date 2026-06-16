"use client";

import { useEffect, useRef, useState } from "react";
import type { ApiKeyProvider, OAuthProvider } from "./types";
import { useI18n } from "@/i18n/use-i18n";
import { ModalOverlay } from "./modal-overlay";
import { ProviderIcon } from "./provider-icon";

interface Props {
  oauthProviders: OAuthProvider[];
  apiKeyProviders: ApiKeyProvider[];
  onSelectOAuth: (id: string) => void;
  onSelectApiKey: (id: string) => void;
  onAddCustom: () => void;
  onClose: () => void;
}

export function AddProviderDialog({
  oauthProviders,
  apiKeyProviders,
  onSelectOAuth,
  onSelectApiKey,
  onAddCustom,
  onClose,
}: Props) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const query = search.trim().toLowerCase();
  const oauth = oauthProviders.filter(
    (provider) =>
      !query ||
      provider.name.toLowerCase().includes(query) ||
      provider.id.toLowerCase().includes(query),
  );
  const apiKey = apiKeyProviders.filter(
    (provider) =>
      !provider.configured &&
      (!query ||
        provider.name.toLowerCase().includes(query) ||
        provider.id.toLowerCase().includes(query)),
  );
  const showCustom =
    !query ||
    "custom".includes(query) ||
    "openai-compatible".includes(query) ||
    "anthropic-compatible".includes(query);

  return (
    <ModalOverlay
      onClose={onClose}
      zIndex={1100}
      label={t.models.addModelProvider}
    >
      <div className="flex max-h-[72vh] w-[min(820px,calc(100vw-32px))] flex-col overflow-hidden rounded-[10px] border border-line bg-canvas shadow-2xl">
        <div className="border-b border-line px-3.5 py-2.5">
          <input
            ref={inputRef}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t.models.searchProviders}
            aria-label={t.models.searchProviders}
            className="w-full border-none bg-transparent text-[13px] text-primary outline-none"
          />
        </div>
        <div className="grid flex-1 grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-2 overflow-y-auto p-3.5">
          {showCustom && (
            <>
              <CategoryTitle>{t.models.custom}</CategoryTitle>
              <ProviderCard
                title={t.models.compatibleProvider}
                detail={t.models.customEndpointFormat}
                onClick={onAddCustom}
              />
            </>
          )}
          {oauth.length > 0 && (
            <>
              <CategoryTitle>{t.models.subscriptions}</CategoryTitle>
              {oauth.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  title={provider.name}
                  detail="OAuth"
                  icon={<ProviderIcon id={provider.id} size={28} />}
                  onClick={() => onSelectOAuth(provider.id)}
                />
              ))}
            </>
          )}
          {apiKey.length > 0 && (
            <>
              <CategoryTitle>{t.models.apiKey}</CategoryTitle>
              {apiKey.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  title={provider.name}
                  detail={`${provider.modelCount} model${
                    provider.modelCount === 1 ? "" : "s"
                  }`}
                  icon={<ProviderIcon id={provider.id} size={28} />}
                  onClick={() => onSelectApiKey(provider.id)}
                />
              ))}
            </>
          )}
          {!showCustom && oauth.length === 0 && apiKey.length === 0 && (
            <p className="col-span-full py-8 text-center text-[12px] text-dim">
              {t.models.noProvidersMatch}
            </p>
          )}
        </div>
      </div>
    </ModalOverlay>
  );
}

function CategoryTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="col-span-full pt-1 text-[10px] font-semibold uppercase tracking-[0.07em] text-dim">
      {children}
    </div>
  );
}

function ProviderCard({
  title,
  detail,
  icon,
  onClick,
}: {
  title: string;
  detail: string;
  icon?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-0 items-center gap-2 rounded-[7px] border border-line bg-panel px-3 py-2.5 text-left hover:border-accent hover:bg-hover"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] font-semibold text-primary">
          {title}
        </div>
        <div className="mt-0.5 text-[10px] text-dim">{detail}</div>
      </div>
      {icon ?? <span className="text-[20px] text-muted">+</span>}
    </button>
  );
}
