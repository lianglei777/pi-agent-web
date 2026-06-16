import type {
  ApiKeyProvider,
  ModelsJson,
  Selection,
} from "./types";
import { useI18n } from "@/i18n/use-i18n";
import { Server } from "lucide-react";
import { ProviderIcon } from "./provider-icon";

interface Props {
  config: ModelsJson;
  apiKeyProviders: ApiKeyProvider[];
  selection: Selection | null;
  onSelect: (selection: Selection) => void;
  onAddProvider: () => void;
}

export function ModelsConfigSidebar({
  config,
  apiKeyProviders,
  selection,
  onSelect,
  onAddProvider,
}: Props) {
  const providers = Object.entries(config.providers ?? {});
  const { t } = useI18n();
  return (
    <aside className="flex w-[210px] shrink-0 flex-col border-r border-line bg-panel">
      <div className="flex-1 overflow-y-auto px-1.5 py-2">
        
        {apiKeyProviders
          .filter((provider) => provider.configured)
          .map((provider) => (
            <NavButton
              key={`apikey-${provider.id}`}
              selected={
                selection?.type === "apikey" &&
                selection.providerId === provider.id
              }
              onClick={() =>
                onSelect({ type: "apikey", providerId: provider.id })
              }
            >
              <ProviderIcon id={provider.id} size={16} />
              <span className="truncate text-[12px] text-primary">
                {provider.name}
              </span>
            </NavButton>
          ))}

        {/* {(oauthProviders.length > 0 ||
          apiKeyProviders.some((provider) => provider.configured)) &&
          providers.length > 0 && (
            <div className="mx-2 my-1 border-t border-line" />
          )} */}

        {providers.map(([providerName, provider]) => (
          <div key={providerName} className="mb-0.5">
            <NavButton
              selected={
                selection?.type === "provider" &&
                selection.name === providerName
              }
              onClick={() =>
                onSelect({ type: "provider", name: providerName })
              }
            >
              <ServerIcon />
              <span className="truncate font-ui-mono text-[12px] text-primary">
                {providerName}
              </span>
            </NavButton>
            {(provider.models ?? []).map((model, index) => (
              <NavButton
                key={`${providerName}-${index}`}
                inset
                selected={
                  selection?.type === "model" &&
                  selection.providerName === providerName &&
                  selection.index === index
                }
                onClick={() =>
                  onSelect({ type: "model", providerName, index })
                }
              >
                <span className="truncate text-[11px] text-muted">
                  {model.id || t.models.newModel}
                </span>
                {model.reasoning && (
                  <span className="ml-auto text-[9px] text-accent">T</span>
                )}
              </NavButton>
            ))}
            {/* <button
              className="w-full rounded-[5px] py-1 pr-2 pl-[26px] text-left text-[11px] text-dim hover:bg-hover"
              type="button"
              onClick={() => onAddModel(providerName)}
            >
              + model
            </button> */}
          </div>
        ))}
      </div>
      <div className="border-t border-line px-1.5 py-2">
        <button
          type="button"
          onClick={onAddProvider}
          className="w-full rounded-[5px] border border-dashed border-line bg-transparent py-1.5 text-[12px] text-muted hover:border-accent hover:text-accent"
        >
          + {t.models.addProvider}
        </button>
      </div>
    </aside>
  );
}

function ServerIcon() {
  return (
    <Server
      size={11}
      className="shrink-0 text-dim"
      aria-hidden="true"
    />
  );
}

function NavButton({
  children,
  selected,
  inset = false,
  onClick,
}: {
  children: React.ReactNode;
  selected: boolean;
  inset?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-[7px] rounded-[5px] py-[5px] pr-2 text-left hover:bg-hover ${
        inset ? "pl-[26px]" : "pl-2"
      }`}
      style={{ background: selected ? "var(--bg-selected)" : undefined }}
    >
      {children}
    </button>
  );
}
