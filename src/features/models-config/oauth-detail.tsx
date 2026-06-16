"use client";

import { useEffect, useRef, useState } from "react";
import { logoutOAuth, submitOAuthInput } from "./api";
import { useI18n } from "@/i18n/use-i18n";
import { SectionTitle } from "./shared";
import type {
  OAuthLoginState,
  OAuthProvider,
  OAuthServerEvent,
} from "./types";

export default function OAuthDetail({
  provider,
}: {
  provider: OAuthProvider;
}) {
  const [state, setState] = useState<OAuthLoginState>({ phase: "idle" });
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState<boolean | null>(null);
  const sourceRef = useRef<EventSource | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    return () => sourceRef.current?.close();
  }, []);

  function startLogin() {
    sourceRef.current?.close();
    setState({ phase: "connecting" });
    setInput("");
    const source = new EventSource(
      `/api/auth/login/${encodeURIComponent(provider.id)}`,
    );
    sourceRef.current = source;

    const onOAuthEvent = (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data) as OAuthServerEvent;
        switch (data.type) {
          case "auth":
            setState({
              phase: "auth",
              url: data.url,
              instructions: data.instructions,
            });
            window.open(data.url, "_blank", "noopener,noreferrer");
            break;
          case "device_code":
            setState({ phase: "device_code", ...data });
            window.open(
              data.verificationUri,
              "_blank",
              "noopener,noreferrer",
            );
            break;
          case "prompt":
            setInput("");
            setState({ phase: "prompt", ...data });
            break;
          case "select":
            setState({ phase: "select", ...data });
            break;
          case "progress":
            setState({ phase: "progress", message: data.message });
            break;
          case "complete":
            source.close();
            setConnected(true);
            setState({ phase: "success" });
            break;
          case "error":
            source.close();
            setState({ phase: "error", message: data.message });
            break;
        }
      } catch {
        setState({ phase: "error", message: t.models.invalidLoginResponse });
      }
    };

    source.addEventListener("oauth", onOAuthEvent);
    source.onerror = () => {
      source.close();
      setState((current) =>
        current.phase === "success"
          ? current
          : { phase: "error", message: t.models.connectionLost },
      );
    };
  }

  async function submit(token: string, value: string) {
    setState({ phase: "progress", message: t.models.verifying });
    try {
      await submitOAuthInput(provider.id, token, value);
    } catch (error) {
      setState({
        phase: "error",
        message: error instanceof Error ? error.message : t.models.failedToSubmit,
      });
    }
  }

  async function disconnect() {
    try {
      await logoutOAuth(provider.id);
      setConnected(false);
      setState({ phase: "idle" });
    } catch (error) {
      setState({
        phase: "error",
        message:
          error instanceof Error ? error.message : t.models.failedToDisconnect,
      });
    }
  }

  const working = !["idle", "success", "error"].includes(state.phase);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <SectionTitle>{t.models.subscription}</SectionTitle>
        <span className="text-[11px] text-dim">
          {connected === null
            ? t.models.statusUnavailable
            : connected
              ? t.models.connected
              : t.models.notConnected}
        </span>
      </div>

      <OAuthState state={state} input={input} setInput={setInput} submit={submit} />

      <div className="flex gap-2">
        {working ? (
          <button
            type="button"
            onClick={() => {
              sourceRef.current?.close();
              setState({ phase: "idle" });
            }}
            className="rounded-[5px] border border-line px-3 py-1.5 text-[12px] text-muted"
          >
            {t.common.cancel}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={startLogin}
              className="rounded-[5px] bg-accent px-4 py-1.5 text-[12px] font-semibold text-white"
            >
              {t.models.login}
            </button>
            <button
              type="button"
              onClick={disconnect}
              className="rounded-[5px] border border-red-400/30 px-3 py-1.5 text-[12px] text-red-500"
            >
              {t.models.disconnect}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function OAuthState({
  state,
  input,
  setInput,
  submit,
}: {
  state: OAuthLoginState;
  input: string;
  setInput: (value: string) => void;
  submit: (token: string, value: string) => void;
}) {
  const { t } = useI18n();

  if (state.phase === "idle") {
    return <p className="text-[13px] text-muted">{t.models.connectOAuth}</p>;
  }
  if (state.phase === "connecting") {
    return <p className="text-[13px] text-muted">{t.models.openingLogin}</p>;
  }
  if (state.phase === "auth") {
    return (
      <div className="flex flex-col gap-2 text-[13px] text-muted">
        {state.instructions && <p>{state.instructions}</p>}
        <a className="text-accent hover:underline" href={state.url} target="_blank" rel="noreferrer">
          {t.models.openLoginPage}
        </a>
      </div>
    );
  }
  if (state.phase === "device_code") {
    return (
      <div className="flex flex-col gap-2 text-[13px] text-muted">
        <p>{t.models.enterCode}</p>
        <code className="self-start rounded border border-line px-4 py-2 text-[16px] font-bold">
          {state.userCode}
        </code>
        <a className="text-accent hover:underline" href={state.verificationUri} target="_blank" rel="noreferrer">
          {state.verificationUri}
        </a>
      </div>
    );
  }
  if (state.phase === "prompt") {
    const canSubmit = state.allowEmpty || input.trim().length > 0;
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[13px] text-muted">{state.message}</p>
        <div className="flex gap-1.5">
          <input
            autoFocus
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={state.placeholder}
            className="flex-1 rounded-[5px] border border-line bg-panel px-2 py-1.5 text-[12px] text-primary"
          />
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => submit(state.token, input)}
            className="rounded-[5px] bg-accent px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
          >
            {t.models.submit}
          </button>
        </div>
      </div>
    );
  }
  if (state.phase === "select") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[13px] text-muted">{state.message}</p>
        {state.options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => submit(state.token, option.id)}
            className="rounded border border-line px-2.5 py-1.5 text-left text-[12px]"
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  }
  if (state.phase === "success") {
    return (
      <p className="text-[13px] text-green-400">
        {t.models.connectedSuccessfully}
      </p>
    );
  }
  return (
    <p className={`text-[13px] ${state.phase === "error" ? "text-red-400" : "text-muted"}`}>
      {state.message}
    </p>
  );
}
