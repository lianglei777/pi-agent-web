"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  GitFork,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/use-i18n";
import { deleteSession, renameSession } from "./api";
import {
  formatRelativeTime,
  getSessionTitle,
} from "./session-utils";
import type { SessionInfo, SessionTreeNode } from "./types";

export function SessionTree({
  nodes,
  selectedSessionId,
  onSelect,
  onChanged,
  onDeleted,
}: {
  nodes: SessionTreeNode[];
  selectedSessionId: string | null;
  onSelect: (session: SessionInfo) => void;
  onChanged: () => Promise<void>;
  onDeleted: (session: SessionInfo) => void;
}) {
  return nodes.map((node) => (
    <SessionTreeItem
      key={node.session.id}
      node={node}
      onChanged={onChanged}
      onDeleted={onDeleted}
      onSelect={onSelect}
      selectedSessionId={selectedSessionId}
    />
  ));
}

function SessionTreeItem({
  node,
  selectedSessionId,
  onSelect,
  onChanged,
  onDeleted,
  depth = 0,
}: {
  node: SessionTreeNode;
  selectedSessionId: string | null;
  onSelect: (session: SessionInfo) => void;
  onChanged: () => Promise<void>;
  onDeleted: (session: SessionInfo) => void;
  depth?: number;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="py-px">
      <SessionRow
        collapsed={collapsed}
        depth={depth}
        hasChildren={node.children.length > 0}
        onChanged={onChanged}
        onDeleted={onDeleted}
        onSelect={onSelect}
        onToggle={() => setCollapsed((current) => !current)}
        selected={node.session.id === selectedSessionId}
        session={node.session}
      />
      {!collapsed && node.children.length ? (
        <div className="ml-4 mt-1 mb-1 border-l border-line-subtle pl-1.5">
          {node.children.map((child) => (
            <SessionTreeItem
              depth={depth + 1}
              key={child.session.id}
              node={child}
              onChanged={onChanged}
              onDeleted={onDeleted}
              onSelect={onSelect}
              selectedSessionId={selectedSessionId}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SessionRow({
  session,
  selected,
  depth,
  hasChildren,
  collapsed,
  onToggle,
  onSelect,
  onChanged,
  onDeleted,
}: {
  session: SessionInfo;
  selected: boolean;
  depth: number;
  hasChildren: boolean;
  collapsed: boolean;
  onToggle: () => void;
  onSelect: (session: SessionInfo) => void;
  onChanged: () => Promise<void>;
  onDeleted: (session: SessionInfo) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [value, setValue] = useState(session.name ?? "");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const title = getSessionTitle(session);
  const { locale, t } = useI18n();
  const isDraft = Boolean(session.draft);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  async function submitRename() {
    const nextName = value.trim();
    if (!nextName || nextName === (session.name ?? "")) {
      setEditing(false);
      setValue(session.name ?? "");
      return;
    }
    setBusy(true);
    try {
      await renameSession(session.id, nextName);
      await onChanged();
      setEditing(false);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.sessions.renameFailed);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await deleteSession(session.id);
      onDeleted(session);
      await onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.sessions.deleteFailed);
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <div className="flex h-[44px] items-center gap-1 px-2">
        <Input
          aria-label={`${t.sessions.rename} ${title}`}
          className="h-7 text-xs"
          disabled={busy}
          onBlur={submitRename}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void submitRename();
            if (event.key === "Escape") {
              setEditing(false);
              setValue(session.name ?? "");
            }
          }}
          ref={inputRef}
          value={value}
        />
        {error ? <span className="sr-only">{error}</span> : null}
      </div>
    );
  }

  return (
    <>
      <div
        className={`group relative mx-1 flex h-[44px] min-w-0 cursor-pointer items-center rounded-md border pr-1 transition-colors duration-[var(--motion-fast)] focus-within:border-line-strong focus-within:bg-selected ${
          selected
            ? "border-line-strong bg-selected"
            : hasChildren && !collapsed
              ? "border-transparent hover:border-line-subtle hover:bg-hover"
              : "border-transparent border-b border-b-line-subtle/60 hover:border-line-subtle hover:border-b-line-subtle hover:bg-hover"
        }`}
        onClick={() => onSelect(session)}
        style={{ paddingLeft: `${4 + depth * 12}px` }}
        title={title}
      >
        {selected ? (
          <span
            aria-hidden
            className="ml-1 size-1.5 flex-none rounded-full bg-accent text-accent"
          />
        ) : null}
        {hasChildren ? (
          <Button
            aria-label={
              collapsed
                ? t.sessions.expandForks
                : t.sessions.collapseForks
            }
            className="size-6"
            onClick={(event) => {
              event.stopPropagation();
              onToggle();
            }}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <ChevronDown
              className={`size-3 transition-transform ${collapsed ? "-rotate-90" : ""}`}
            />
          </Button>
        ) : depth ? (
          <GitFork className="mx-1.5 size-3 flex-none text-dim" />
        ) : (
          <span className="w-6 flex-none" />
        )}
        <div className="min-w-0 flex-1 pr-14">
          <div
            className={`truncate text-xs ${selected ? "font-semibold text-primary" : "font-medium text-primary"}`}
          >
            {title}
          </div>
          <div className="mt-0.5 truncate text-[11px] tabular-nums text-dim">
            {isDraft
              ? t.sessions.draftHint
              : `${formatRelativeTime(session.modified, undefined, locale)} · ${session.messageCount} ${t.sessions.msgs}`}
          </div>
          {error && !confirming ? (
            <div className="truncate text-[11px] text-destructive">{error}</div>
          ) : null}
        </div>
        {isDraft ? null : (
          <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-px rounded-md bg-panel/85 pl-1 opacity-0 pointer-events-none shadow-sm backdrop-blur-sm transition-opacity duration-[var(--motion-fast)] group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto">
            <Button
              aria-label={`${t.sessions.rename} ${title}`}
              className="size-7 hover:text-accent"
              onClick={(event) => {
                event.stopPropagation();
                setEditing(true);
                setError("");
              }}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              aria-label={`${t.common.delete} ${title}`}
              className="size-7 hover:text-destructive"
              onClick={(event) => {
                event.stopPropagation();
                setConfirming(true);
                setError("");
              }}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        )}
      </div>

      <Dialog
        onOpenChange={(open) => {
          if (!open && !busy) setConfirming(false);
        }}
        open={confirming}
      >
        <DialogContent
          className="sm:max-w-[420px]"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle>{t.sessions.deleteSessionTitle}</DialogTitle>
            <DialogDescription>
              {t.sessions.deleteSessionDescription.replace("{session}", title)}
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              autoFocus
              disabled={busy}
              onClick={() => setConfirming(false)}
              type="button"
              variant="outline"
            >
              {t.common.cancel}
            </Button>
            <Button
              disabled={busy}
              onClick={() => void remove()}
              type="button"
              variant="destructive"
            >
              {busy
                ? t.sessions.deletingSession
                : t.sessions.deleteSessionAction}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
