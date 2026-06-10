"use client";

import { useState, useEffect, useRef } from "react";
import {
  type OAuthProvider,
  type OAuthLoginState,
} from "./types";
import { SectionTitle } from "./shared";

interface Props {
  provider: OAuthProvider;
  onRefresh: () => void;
}

export default function OAuthDetail({ provider, onRefresh }: Props) {
  const [loginState, setLoginState] = useState<OAuthLoginState>({
    phase: "idle",
  });
  const [inputValue, setInputValue] = useState("");
  const eventSourceRef = useRef<EventSource | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (
      loginState.phase === "auth" ||
      loginState.phase === "prompt"
    ) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [loginState]);

  function handleLogin() {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setLoginState({ phase: "connecting" });

    const es = new EventSource(
      `/api/auth/login/${encodeURIComponent(provider.id)}`,
    );
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        switch (data.type) {
          case "auth":
            setLoginState({
              phase: "auth",
              url: data.url,
              instructions: data.instructions ?? null,
              token: data.token,
            });
            window.open(
              data.url,
              "_blank",
              "noopener,noreferrer",
            );
            break;
          case "device_code":
            setLoginState({
              phase: "device_code",
              userCode: data.userCode,
              verificationUri: data.verificationUri,
              intervalSeconds: data.intervalSeconds ?? null,
              expiresInSeconds: data.expiresInSeconds ?? null,
            });
            window.open(
              data.verificationUri,
              "_blank",
              "noopener,noreferrer",
            );
            break;
          case "prompt_request":
            setLoginState({
              phase: "prompt",
              message: data.message,
              placeholder: data.placeholder ?? null,
              token: data.token,
            });
            break;
          case "select_request":
            setLoginState({
              phase: "select",
              message: data.message,
              options: data.options,
              token: data.token,
            });
            break;
          case "progress":
            setLoginState({
              phase: "progress",
              message: data.message,
            });
            break;
          case "success":
            es.close();
            setLoginState({ phase: "success" });
            onRefresh();
            break;
          case "error":
            es.close();
            setLoginState({
              phase: "error",
              message: data.message,
            });
            break;
          case "cancelled":
            es.close();
            setLoginState({ phase: "idle" });
            break;
        }
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      es.close();
      setLoginState((prev) => {
        if (prev.phase === "success") return prev;
        return { phase: "error", message: "Connection lost" };
      });
    };
  }

  async function submitCode(token: string, code: string) {
    setLoginState({ phase: "progress", message: "Verifying…" });
    try {
      await fetch(`/api/auth/login/${provider.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, code: code.trim() }),
      });
    } catch {
      setLoginState({ phase: "error", message: "Failed to submit" });
    }
  }

  async function submitSelection(
    token: string,
    value: string,
  ) {
    setLoginState({ phase: "progress", message: "Verifying…" });
    try {
      await fetch(`/api/auth/login/${provider.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, code: value }),
      });
    } catch {
      setLoginState({ phase: "error", message: "Failed to submit" });
    }
  }

  async function handleDisconnect() {
    try {
      await fetch(`/api/auth/logout/${provider.id}`, {
        method: "POST",
      });
      onRefresh();
    } catch {
      // ignore
    }
  }

  const isWorking =
    loginState.phase === "connecting" ||
    loginState.phase === "progress" ||
    loginState.phase === "auth" ||
    loginState.phase === "device_code" ||
    loginState.phase === "prompt" ||
    loginState.phase === "select";

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <SectionTitle>Subscription</SectionTitle>
        <div className="flex items-center gap-1.5">
          <span
            className="h-[7px] w-[7px] rounded-full"
            style={{
              background: provider.loggedIn
                ? "#4ade80"
                : "var(--border)",
            }}
          />
          <span
            className="text-[11px]"
            style={{
              color: provider.loggedIn
                ? "#4ade80"
                : "var(--text-dim)",
            }}
          >
            {provider.loggedIn ? "connected" : "not connected"}
          </span>
        </div>
      </div>

      {/* Status area */}
      <div className="min-h-[48px]">
        {loginState.phase === "idle" && (
          <p className="text-[13px] text-muted">
            {provider.loggedIn
              ? `Already connected to ${provider.name}. Click Re-login to refresh your session.`
              : `Connect your ${provider.name} account.`}
          </p>
        )}

        {loginState.phase === "connecting" && (
          <p className="text-[13px] text-muted">
            Opening browser…
          </p>
        )}

        {loginState.phase === "auth" && (
          <div className="flex flex-col gap-2">
            {loginState.instructions && (
              <p className="text-[13px] text-muted">
                {loginState.instructions}
              </p>
            )}
            <a
              href={loginState.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] text-accent hover:underline"
            >
              Open login page
            </a>
            <div className="flex gap-1.5">
              <input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="callback URL"
                className="font-ui-mono flex-1 rounded-[5px] border border-line px-2 py-1.5 text-[12px]"
                style={{
                  background: "var(--bg)",
                  color: "var(--text)",
                }}
              />
              <button
                onClick={() =>
                  submitCode(loginState.token, inputValue)
                }
                disabled={!inputValue.trim()}
                className="rounded-[5px] px-3 py-1.5 text-[12px] font-semibold"
                style={{
                  background: inputValue.trim()
                    ? "var(--accent)"
                    : "var(--bg-panel)",
                  color: inputValue.trim()
                    ? "#fff"
                    : "var(--text-dim)",
                  cursor: inputValue.trim()
                    ? "pointer"
                    : "not-allowed",
                }}
                type="button"
              >
                Submit
              </button>
            </div>
          </div>
        )}

        {loginState.phase === "device_code" && (
          <div className="flex flex-col gap-2">
            <p className="text-[13px] text-muted">
              Open the verification page and enter the code
              below.
            </p>
            <div
              className="inline-block rounded-[5px] border border-line px-4 py-2 font-ui-mono text-[16px] font-bold"
              style={{ background: "var(--bg)" }}
            >
              {loginState.userCode}
            </div>
            <a
              href={loginState.verificationUri}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] text-accent hover:underline"
            >
              {loginState.verificationUri}
            </a>
            {loginState.expiresInSeconds && (
              <p className="text-[11px] text-dim">
                Expires in {loginState.expiresInSeconds}s
              </p>
            )}
          </div>
        )}

        {loginState.phase === "prompt" && (
          <div className="flex flex-col gap-2">
            <p className="text-[13px] text-muted">
              {loginState.message}
            </p>
            <div className="flex gap-1.5">
              <input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={loginState.placeholder ?? ""}
                className="font-ui-mono flex-1 rounded-[5px] border border-line px-2 py-1.5 text-[12px]"
                style={{
                  background: "var(--bg)",
                  color: "var(--text)",
                }}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    inputValue.trim()
                  ) {
                    submitCode(
                      loginState.token,
                      inputValue,
                    );
                  }
                }}
              />
              <button
                onClick={() =>
                  submitCode(loginState.token, inputValue)
                }
                disabled={!inputValue.trim()}
                className="rounded-[5px] px-3 py-1.5 text-[12px] font-semibold"
                style={{
                  background: inputValue.trim()
                    ? "var(--accent)"
                    : "var(--bg-panel)",
                  color: inputValue.trim()
                    ? "#fff"
                    : "var(--text-dim)",
                  cursor: inputValue.trim()
                    ? "pointer"
                    : "not-allowed",
                }}
                type="button"
              >
                Submit
              </button>
            </div>
          </div>
        )}

        {loginState.phase === "select" && (
          <div className="flex flex-col gap-2">
            <p className="text-[13px] text-muted">
              {loginState.message}
            </p>
            <div className="flex flex-col gap-1.5">
              {loginState.options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() =>
                    submitSelection(loginState.token, opt.id)
                  }
                  className="cursor-pointer rounded border border-line px-2.5 py-1.5 text-left text-[12px]"
                  style={{ background: "var(--bg)" }}
                  type="button"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {loginState.phase === "progress" && (
          <p className="text-[13px] text-muted">
            {loginState.message}
          </p>
        )}

        {loginState.phase === "success" && (
          <p className="text-[13px]" style={{ color: "#4ade80" }}>
            Connected successfully.
          </p>
        )}

        {loginState.phase === "error" && (
          <p className="text-[13px]" style={{ color: "#f87171" }}>
            {loginState.message}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {isWorking ? (
          <button
            onClick={() => {
              eventSourceRef.current?.close();
              setLoginState({ phase: "idle" });
            }}
            className="cursor-pointer rounded-[5px] border border-line px-3 py-1.5 text-[12px]"
            style={{
              background: "none",
              color: "var(--text-muted)",
            }}
            type="button"
          >
            Cancel
          </button>
        ) : (
          <>
            <button
              onClick={handleLogin}
              className="cursor-pointer rounded-[5px] px-4 py-1.5 text-[12px] font-semibold text-white"
              style={{ background: "var(--accent)" }}
              type="button"
            >
              {provider.loggedIn ? "Re-login" : "Login"}
            </button>
            {provider.loggedIn && (
              <button
                onClick={handleDisconnect}
                className="cursor-pointer rounded-[5px] border px-3 py-1.5 text-[12px]"
                style={{
                  borderColor: "rgba(239,68,68,0.3)",
                  color: "#ef4444",
                  background: "none",
                }}
                type="button"
              >
                Disconnect
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
