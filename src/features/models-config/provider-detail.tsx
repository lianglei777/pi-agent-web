"use client";

import { useState } from "react";
import {
  API_OPTIONS,
  type ProviderEntry,
} from "./types";
import { SectionTitle, Field, inputStyle } from "./shared";

interface Props {
  name: string;
  provider: ProviderEntry;
  onChange: (p: ProviderEntry) => void;
  onRename: (oldName: string, newName: string) => void;
  onDelete: (name: string) => void;
}

export default function ProviderDetail({
  name,
  provider,
  onChange,
  onRename,
  onDelete,
}: Props) {
  const [editingName, setEditingName] = useState(name);

  const canRename = editingName !== name && editingName.trim().length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <SectionTitle>Provider</SectionTitle>
        <button
          onClick={() => onDelete(name)}
          className="cursor-pointer rounded border px-2 py-[3px] text-[11px]"
          style={{
            borderColor: "rgba(239,68,68,0.3)",
            color: "#ef4444",
            background: "none",
          }}
          type="button"
        >
          Delete
        </button>
      </div>

      {/* Provider name */}
      <Field label="Provider name">
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
            Rename
          </button>
        )}
      </Field>

      {/* Base URL */}
      <Field label="Base URL">
        <input
          value={provider.baseUrl ?? ""}
          onChange={(e) => onChange({ ...provider, baseUrl: e.target.value })}
          placeholder="https://api.example.com/v1"
          className="font-ui-mono"
          style={{ ...inputStyle }}
        />
      </Field>

      {/* API Key */}
      <Field label="API Key">
        <SecretTextInput
          value={provider.apiKey ?? ""}
          onChange={(v) => onChange({ ...provider, apiKey: v })}
          placeholder="ENV_VAR_NAME, !shell-command, or literal key"
          mono
        />
        <span className="mt-0.5 text-[10px] text-dim">
          Prefix with <code>!</code> to run a shell command, or use an env var name
        </span>
      </Field>

      {/* API */}
      <Field label="API">
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
    </div>
  );
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
