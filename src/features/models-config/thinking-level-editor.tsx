"use client";

import { useCallback, useMemo } from "react";
import {
  THINKING_LEVELS,
  type ThinkingLevel,
} from "./types";

const LEVEL_COLORS: Record<ThinkingLevel, string> = {
  off: "var(--text-dim)",
  minimal: "#6b7280",
  low: "#60a5fa",
  medium: "#a78bfa",
  high: "#f472b6",
  xhigh: "#fb923c",
};

const btnBase: React.CSSProperties = {
  padding: "4px 10px",
  fontSize: 10,
  border: "none",
  cursor: "pointer",
  fontWeight: 400,
  transition: "background 0.1s, color 0.1s",
  whiteSpace: "nowrap",
  background: "var(--bg-panel)",
  color: "var(--text-dim)",
};

const btnActive: React.CSSProperties = {
  background: "var(--accent)",
  color: "#fff",
  fontWeight: 600,
};

const btnActiveDisabled: React.CSSProperties = {
  background: "#ef4444",
  color: "#fff",
  fontWeight: 600,
};

interface Props {
  value?: Record<string, string | null>;
  onChange: (v: Record<string, string | null> | undefined) => void;
}

export default function ThinkingLevelMapEditor({ value, onChange }: Props) {
  const map = useMemo(() => value ?? {}, [value]);

  const setLevel = useCallback(
    (level: string, newVal: string | null) => {
      const next = { ...map };
      if (newVal === "__omit__") {
        delete next[level];
      } else {
        next[level] = newVal;
      }
      onChange(Object.keys(next).length ? next : undefined);
    },
    [map, onChange],
  );

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted">Thinking level map</span>
        {Object.keys(map).length > 0 && (
          <button
            onClick={() => onChange(undefined)}
            className="cursor-pointer border-none bg-transparent text-[10px] text-dim hover:text-primary"
            type="button"
          >
            Clear all
          </button>
        )}
      </div>
      {THINKING_LEVELS.map((level) => {
        const raw = map[level];
        let state: "omit" | "null" | "string";
        let strVal = "";
        if (!(level in map)) {
          state = "omit";
        } else if (raw === null) {
          state = "null";
        } else {
          state = "string";
          strVal = raw;
        }
        const color = LEVEL_COLORS[level];

        return (
          <div
            key={level}
            className="flex items-center gap-2 rounded-md border border-transparent px-1 py-[5px]"
          >
            {/* Level badge */}
            <div className="flex w-[68px] shrink-0 items-center gap-[5px]">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{
                  background: color,
                  opacity: state === "null" ? 0.3 : 1,
                }}
              />
              <span
                className="font-ui-mono text-[11px]"
                style={{
                  color: state === "null" ? "var(--text-dim)" : "var(--text-muted)",
                  textDecoration: state === "null" ? "line-through" : "none",
                }}
              >
                {level}
              </span>
            </div>

            {/* Default / Disabled buttons */}
            <div className="flex shrink-0 overflow-hidden rounded-[5px] border border-line">
              <button
                onClick={() => setLevel(level, "__omit__")}
                style={{
                  ...btnBase,
                  ...(state === "omit" ? btnActive : {}),
                }}
                type="button"
              >
                Default
              </button>
              <button
                onClick={() => setLevel(level, null)}
                style={{
                  ...btnBase,
                  borderLeft: "1px solid var(--border)",
                  ...(state === "null" ? btnActiveDisabled : {}),
                }}
                type="button"
              >
                Disabled
              </button>
            </div>

            {/* Custom button + input */}
            <div
              className="flex overflow-hidden rounded-[5px] transition-[border-color] duration-100"
              style={{
                border:
                  state === "string"
                    ? "1px solid var(--accent)"
                    : "1px solid var(--border)",
              }}
            >
              <button
                onClick={() => setLevel(level, strVal || level)}
                style={{
                  ...btnBase,
                  ...(state === "string" ? btnActive : {}),
                  borderRight: "1px solid var(--border)",
                }}
                type="button"
              >
                Custom
              </button>
              <input
                value={strVal}
                onChange={(e) => setLevel(level, e.target.value)}
                onFocus={() => {
                  if (state !== "string") setLevel(level, strVal || level);
                }}
                placeholder={level}
                maxLength={10}
                className="border-none font-ui-mono text-[11px] transition-[background,color] duration-100 outline-none"
                style={{
                  width: "12ch",
                  background: state === "string" ? "var(--bg)" : "var(--bg-panel)",
                  color: state === "string" ? "var(--text)" : "var(--text-dim)",
                  padding: "4px 7px",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
