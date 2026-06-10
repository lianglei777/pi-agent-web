"use client";

import type { ReactNode } from "react";

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-dim">
      {children}
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium text-muted">{label}</label>
      {children}
    </div>
  );
}

export const inputStyle: React.CSSProperties = {
  padding: "6px 9px",
  background: "var(--bg-panel)",
  border: "1px solid var(--border)",
  borderRadius: 5,
  color: "var(--text)",
  fontSize: 12,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};
