"use client";

import { useEffect, useState } from "react";
import { FileText, PanelRightClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useI18n } from "@/i18n/use-i18n";
import { loadFile } from "./api";
import { FileTree } from "./file-tree";
import type { OpenFile } from "./types";

export type { OpenFile } from "./types";

export function FilePanel({
  cwd,
  file,
  onAtMention,
  onClose,
  onOpenFile,
  refreshKey = 0,
}: {
  cwd?: string | null;
  file: OpenFile | null;
  onAtMention?: (path: string) => void;
  onClose: () => void;
  onOpenFile?: (path: string, name: string) => void;
  refreshKey?: number;
}) {
  const { t } = useI18n();

  return (
    <div className="flex h-full w-full min-w-0 flex-col">
      <div className="flex h-10 flex-none items-stretch border-b border-line-subtle bg-panel text-[11px] text-muted">
        <span
          className="flex min-w-0 flex-1 items-center truncate px-3"
          title={file?.path}
        >
          {file?.name ?? t.files.files}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label={t.workspace.hideFilePanel}
              className="rounded-none border-l border-line-subtle"
              onClick={onClose}
              size="icon"
              type="button"
              variant="ghost"
            >
              <PanelRightClose />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {t.workspace.hideFilePanel}
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          {file ? <LoadedFile file={file} key={file.path} /> : <EmptyFile />}
        </div>
        {cwd && onOpenFile ? (
          <aside className="flex w-[210px] shrink-0 border-l border-line-subtle">
            <FileTree
              cwd={cwd}
              onAtMention={onAtMention}
              onOpenFile={onOpenFile}
              refreshKey={refreshKey}
            />
          </aside>
        ) : null}
      </div>
    </div>
  );
}

function EmptyFile() {
  const { t } = useI18n();
  return (
    <div className="grid flex-1 place-items-center p-6">
      <div className="text-center text-muted">
        <div className="mx-auto mb-3 grid size-9 place-items-center rounded-md border border-line-subtle bg-elevated">
          <FileText className="size-4" />
        </div>
        <p className="m-0 text-xs">{t.files.noFileOpen}</p>
      </div>
    </div>
  );
}

function LoadedFile({ file }: { file: OpenFile }) {
  const { t } = useI18n();
  const [result, setResult] = useState<{
    content: string;
    error: string;
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    loadFile(file.path, controller.signal)
      .then((data) => setResult({ content: data.content ?? "", error: "" }))
      .catch((cause: unknown) => {
        if ((cause as { name?: string }).name !== "AbortError") {
          setResult({
            content: "",
            error:
              cause instanceof Error ? cause.message : t.files.unableToOpenFile,
          });
        }
      });
    return () => controller.abort();
  }, [file, t.files.unableToOpenFile]);

  if (!result) {
    return <div className="p-4 text-xs text-dim">{t.files.loading}</div>;
  }
  if (result.error) {
    return <div className="p-4 text-xs text-destructive">{result.error}</div>;
  }
  return (
    <pre className="m-0 min-h-0 flex-1 overflow-auto p-4 font-ui-mono text-xs leading-5 whitespace-pre-wrap text-primary">
      {result.content}
    </pre>
  );
}
