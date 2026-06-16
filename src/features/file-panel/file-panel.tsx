"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/i18n/use-i18n";

export type OpenFile = { path: string; name: string };

export function FilePanel({ file }: { file: OpenFile | null }) {
  const { t } = useI18n();

  return (
    <div className="flex h-full w-full min-w-0 flex-col">
      <div className="flex h-9 flex-none items-center border-b border-line bg-panel px-3 text-[11px] text-muted">
        <span className="truncate" title={file?.path}>
          {file?.name ?? t.files.files}
        </span>
      </div>
      {file ? <LoadedFile file={file} key={file.path} /> : <EmptyFile />}
    </div>
  );
}

function EmptyFile() {
  const { t } = useI18n();

  return (
    <div className="grid flex-1 place-items-center p-6">
      <Card className="border-0 bg-transparent text-center shadow-none">
        <CardContent className="px-6 py-8">
          <div className="mx-auto mb-3 grid size-10 place-items-center rounded-lg border border-border bg-card text-muted-foreground">
            <FileText className="size-5" />
          </div>
          <p className="m-0 text-xs text-muted-foreground">
            {t.files.noFileOpen}
          </p>
        </CardContent>
      </Card>
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
    const params = new URLSearchParams({ path: file.path, type: "read" });
    fetch(`/api/files/_?${params}`, { signal: controller.signal })
      .then(async (response) => {
        const data = (await response.json()) as {
          content?: string;
          error?: { message?: string };
        };
        if (!response.ok) {
          throw new Error(
            data.error?.message ?? `${t.files.requestFailed} (${response.status})`,
          );
        }
        setResult({ content: data.content ?? "", error: "" });
      })
      .catch((cause: unknown) => {
        if ((cause as { name?: string }).name !== "AbortError") {
          setResult({
            content: "",
            error: cause instanceof Error ? cause.message : t.files.unableToOpenFile,
          });
        }
      });
    return () => controller.abort();
  }, [file, t.files.requestFailed, t.files.unableToOpenFile]);

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
