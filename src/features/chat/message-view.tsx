"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  GitBranch,
  GitFork,
  MoreHorizontal,
  PencilLine,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  vscDarkPlus,
  vs,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/use-i18n";
import { assistantErrorDetails } from "./assistant-error";
import type {
  AgentMessage,
  AgentFailure,
  AssistantMessage,
  ToolResultMessage,
  UserMessage,
} from "./agent-types";
import { toolResults } from "./chat-logic";

export function MessageList({
  messages,
  entryIds,
  streamingMessage,
  running,
  forkingEntryId,
  lastUserRef,
  highlightedMessageId,
  onMessageElement,
  onFork,
  onEdit,
}: {
  messages: AgentMessage[];
  entryIds: string[];
  streamingMessage: Partial<AssistantMessage> | null;
  running: boolean;
  forkingEntryId: string | null;
  lastUserRef: React.MutableRefObject<HTMLElement | null>;
  highlightedMessageId?: string | null;
  onMessageElement?: (id: string, element: HTMLElement | null) => void;
  onFork: (entryId: string) => void;
  onEdit: (targetId: string, text: string) => void;
}) {
  const results = useMemo(() => toolResults(messages), [messages]);
  const visible = messages
    .map((message, index) => ({ message, index }))
    .filter(
      (
        item,
      ): item is {
        message: UserMessage | AssistantMessage;
        index: number;
      } => item.message.role === "user" || item.message.role === "assistant",
    );
  return (
    <>
      {visible.map(({ message, index }, visibleIndex) => {
        const previous = index > 0 ? messages[index - 1] : null;
        const entryId = entryIds[index];
        const previousEntryId = index > 0 ? entryIds[index - 1] : undefined;
        const minimapId =
          entryId ??
          (message.role === "user" ? message.clientId : undefined) ??
          `${message.role}-${message.timestamp ?? "untimed"}-${index}`;
        const isLastUser =
          message.role === "user" &&
          !visible.slice(visibleIndex + 1).some((item) => item.message.role === "user");
        const highlighted = highlightedMessageId === minimapId;
        return (
          <article
            className={cn(
              "group relative mb-8 scroll-mt-4 px-2 py-1 transition-[background-color,outline-color] duration-[var(--motion-fast)] -mx-2",
              highlighted &&
                "bg-subtle outline outline-1 outline-line-strong",
            )}
            data-message-role={message.role}
            key={entryId ?? `${message.role}-${index}-${message.timestamp ?? 0}`}
            ref={(element) => {
              onMessageElement?.(minimapId, element);
              if (isLastUser) lastUserRef.current = element;
            }}
          >
            {message.role === "user" ? (
              <UserMessageView
                canEdit={previous?.role === "assistant" && Boolean(previousEntryId)}
                canFork={Boolean(entryId) && visibleIndex > 0}
                entryId={entryId}
                forking={forkingEntryId === entryId}
                message={message}
                onEdit={() =>
                  previousEntryId &&
                  onEdit(previousEntryId, messageText(message))
                }
                onFork={() => entryId && onFork(entryId)}
                running={running}
              />
            ) : (
              <AssistantMessageView
                message={message}
                results={results}
              />
            )}
          </article>
        );
      })}

      {/* Streaming assistant output */}
      {streamingMessage ? (
        <article
          className={cn(
            "relative mb-8 px-2 py-1 transition-[background-color,outline-color] duration-[var(--motion-fast)] -mx-2",
            highlightedMessageId === "streaming-assistant" &&
              "bg-subtle outline outline-1 outline-line-strong",
          )}
          data-message-role="assistant"
          data-streaming="true"
          ref={(element) => {
            onMessageElement?.("streaming-assistant", element);
          }}
        >
          <AssistantMessageView
            message={{
              role: "assistant",
              content: streamingMessage.content ?? [],
              provider: streamingMessage.provider ?? "",
              model: streamingMessage.model ?? "",
            }}
            results={results}
            streaming
          />
        </article>
      ) : null}
    </>
  );
}

function UserMessageView({
  message,
  entryId,
  running,
  canEdit,
  canFork,
  forking,
  onEdit,
  onFork,
}: {
  message: UserMessage;
  entryId?: string;
  running: boolean;
  canEdit: boolean;
  canFork: boolean;
  forking: boolean;
  onEdit: () => void;
  onFork: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const { t } = useI18n();
  const blocks =
    typeof message.content === "string"
      ? [{ type: "text" as const, text: message.content }]
      : message.content;
  return (
    <div className="flex flex-col items-end">
      <div className="max-w-[76%] rounded-lg border border-line-subtle bg-[var(--user-bg)] px-3.5 py-2.5 text-sm leading-[1.65] break-words whitespace-pre-wrap max-[640px]:max-w-[90%]">
        <div className="flex flex-wrap gap-2">

          {/* image content */}
          {blocks
            .filter((block) => block.type === "image")
            .map((block, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={t.chat.message.attachedImage}
                className="max-h-60 max-w-60 rounded-lg object-contain"
                key={index}
                src={
                  block.source.url ??
                  `data:${block.source.mediaType};base64,${block.source.data}`
                }
              />
            ))}
        </div>

        {/* text content */}
        {blocks
          .filter((block) => block.type === "text")
          .map((block, index) => (
            <div className="mt-1 first:mt-0" key={index}>
              {block.text}
            </div>
          ))}
      </div>


      <div className="mt-1 flex min-h-7 items-center gap-1 opacity-100 transition-opacity min-[641px]:opacity-0 min-[641px]:group-hover:opacity-100 min-[641px]:group-focus-within:opacity-100">
        {message.status === "failed" ? (
          <Badge variant="destructive">{t.chat.message.failed}</Badge>
        ) : null}

        <div className="hidden items-center gap-1 min-[641px]:flex">
          <SmallAction
            label={copied ? t.chat.message.copied : t.chat.message.copy}
            onClick={() => void copyText(messageText(message)).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            })}
          >
            {copied ? <Check /> : <Copy />}
          </SmallAction>
          {canEdit && !running ? (
            <SmallAction label={t.chat.message.editFromHere} onClick={onEdit}>
              <PencilLine />
            </SmallAction>
          ) : null}
          {canFork && entryId && !running ? (
            <SmallAction
              disabled={forking}
              label={forking ? t.chat.message.creating : t.chat.message.newSession}
              onClick={onFork}
            >
              <GitFork />
            </SmallAction>
          ) : null}
        </div>

        <div className="min-[641px]:hidden">
          <MessageActionMenu
            canEdit={canEdit && !running}
            canFork={canFork && Boolean(entryId) && !running}
            copied={copied}
            copyingText={messageText(message)}
            forking={forking}
            onCopied={() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            }}
            onEdit={onEdit}
            onFork={onFork}
          />
        </div>

        {/* time */}
        {message.timestamp ? <MessageTime value={message.timestamp} /> : null}
      </div>
    </div>
  );
}

function AssistantMessageView({
  message,
  results,
  streaming = false,
}: {
  message: AssistantMessage;
  results: Map<string, ToolResultMessage>;
  streaming?: boolean;
}) {

  const [copied, setCopied] = useState(false);
  const [errorCopied, setErrorCopied] = useState(false);
  const { t } = useI18n();
  const error = assistantErrorDetails(message);
  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n\n");

  return (
    <div>
      <div
        className="mb-2 text-[11px] font-medium text-dim"
        title={
          message.provider && message.model
            ? `${message.provider}:${message.model}`
            : undefined
        }
      >
        {/* provider: model */}
        {message.provider && message.model ? message.model : "Pi Agent"}
        
        {/* Token throughput */}
        {streaming ? <StreamingSpeed message={message} /> : null}
      </div>

      {error ? (
        <div
          className="my-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm"
          role="alert"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-destructive">
                {failureSummary(error.code, error.summary, t)}
              </div>
              <div className="mt-1 text-xs text-muted">
                {message.provider && message.model
                  ? `${message.provider}:${message.model} · `
                  : ""}
                {t.chat.error.code}: {error.code}
              </div>
              {error.technicalMessage ? (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-medium text-muted hover:text-primary">
                    {t.chat.error.technicalDetails}
                  </summary>
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md border border-line-subtle bg-[var(--tool-bg)] p-2 font-ui-mono text-[11px] text-muted">
                    {error.technicalMessage}
                  </pre>
                  <Button
                    className="mt-2 h-7 px-2 text-[10px]"
                    onClick={() =>
                      void copyText(error.technicalMessage ?? "").then(() => {
                        setErrorCopied(true);
                        window.setTimeout(() => setErrorCopied(false), 1500);
                      })
                    }
                    size="sm"
                    variant="outline"
                  >
                    {errorCopied
                      ? t.chat.error.copied
                      : t.chat.error.copyDetails}
                  </Button>
                </details>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Assistant reply content */}
      {message.content.map((block, index) => {
        // Render text returned by the model as Markdown
        if (block.type === "text") {
          return <Markdown key={index} text={block.text} />;
        }

        // Thinking content
        if (block.type === "thinking") {
          return (
            <Accordion className="my-1.5" collapsible key={index} type="single">
              <AccordionItem value="thinking">
                <AccordionTrigger>{t.chat.message.thinking}</AccordionTrigger>
                <AccordionContent>{block.thinking}</AccordionContent>
              </AccordionItem>
            </Accordion>
          );
        }

        // Image
        if (block.type === "image") {
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={t.chat.message.assistantImage}
              className="my-2 max-h-80 max-w-full rounded-lg object-contain"
              key={index}
              src={
                block.source.url ??
                `data:${block.source.mediaType};base64,${block.source.data}`
              }
            />
          );
        }

        const result = results.get(block.toolCallId);
        const summary = toolSummary(block.input);

        return (
          <Accordion className="my-1.5" collapsible key={block.toolCallId} type="single">
            <AccordionItem
              className={result?.isError ? "border-destructive/40" : "border-success/35"}
              value={block.toolCallId}
            >
              <AccordionTrigger>
                <GitBranch className="size-3.5" />
                <span className="truncate">{block.toolName}</span>
                {summary ? <span className="truncate text-dim">{summary}</span> : null}
                <Badge
                  className="ml-auto"
                  variant={result?.isError ? "destructive" : result ? "success" : "outline"}
                >
                  {result?.isError ? t.chat.message.toolError : result ? t.chat.message.toolDone : t.chat.message.toolRunning}
                </Badge>
              </AccordionTrigger>
              <AccordionContent className="max-h-[400px] overflow-auto">
                {JSON.stringify(block.input, null, 2)}
                {"\n\n"}
                {result ? resultText(result, t) : t.chat.message.waitingForOutput}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        );
      })}

      {!streaming ? (
        <div className="mt-2 flex min-h-7 items-center gap-2 text-[10px] text-dim opacity-100 transition-opacity min-[641px]:opacity-0 min-[641px]:group-hover:opacity-100 min-[641px]:group-focus-within:opacity-100">
          
          {message.usage ? (
            <span>
              {t.chat.message.usageIn} {message.usage.input} / {t.chat.message.usageOut} {message.usage.output} / {t.chat.message.usageCache}{" "}
              {message.usage.cacheRead} / ${message.usage.cost.total.toFixed(4)}
            </span>
          ) : null}

          {text ? (
            <SmallAction
              label={copied ? t.chat.message.copied : t.chat.message.copy}
              onClick={() => void copyText(text).then(() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              })}
            >
              {copied ? <Check /> : <Copy />}
            </SmallAction>
          ) : null}

          {message.timestamp ? <MessageTime value={message.timestamp} /> : null}
        </div>
      ) : null}
    </div>
  );
}

function failureSummary(
  code: AgentFailure["code"],
  fallback: string,
  t: ReturnType<typeof useI18n>["t"],
) {
  switch (code) {
    case "MODEL_AUTH_FAILED":
      return t.chat.error.authFailed;
    case "MODEL_RATE_LIMITED":
      return t.chat.error.rateLimited;
    case "MODEL_PROTOCOL_ERROR":
      return t.chat.error.protocolError;
    case "MODEL_TIMEOUT":
      return t.chat.error.timeout;
    case "MODEL_UNAVAILABLE":
      return t.chat.error.unavailable;
    default:
      return fallback || t.chat.error.requestFailed;
  }
}

function Markdown({ text }: { text: string }) {
  return (
    <div className="text-sm leading-[1.7] text-primary [&_a]:text-accent [&_a]:underline [&_blockquote]:border-l [&_blockquote]:border-line-subtle [&_blockquote]:pl-3 [&_code]:font-ui-mono [&_li]:my-1 [&_ol]:my-3 [&_ol]:pl-6 [&_p]:my-3 [&_table]:my-3 [&_table]:w-full [&_td]:border [&_td]:border-line-subtle [&_td]:p-2 [&_th]:border [&_th]:border-line-subtle [&_th]:p-2 [&_ul]:my-3 [&_ul]:pl-6">
      <ReactMarkdown
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className ?? "");
            const code = String(children).replace(/\n$/, "");
            if (!match) {
              return (
                <code
                  className="rounded bg-selected px-1 py-0.5 text-[0.88em]"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return <CodeBlock code={code} language={match[1]} />;
          },
        }}
        remarkPlugins={[remarkGfm]}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  const { t } = useI18n();
  const dark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");
  return (
    <div className="my-3 overflow-hidden rounded-lg border border-line-subtle bg-[var(--tool-bg)]">
      <div className="flex h-8 items-center border-b border-line-subtle px-3 text-[10px] text-muted">
        <span>{language}</span>
        <Button
          className="ml-auto h-6 px-2 text-[10px]"
          onClick={() => void copyText(code).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          })}
          size="sm"
          variant="ghost"
        >
          {copied ? t.chat.message.copied : t.chat.message.copy}
        </Button>
      </div>
      <SyntaxHighlighter
        customStyle={{ margin: 0, background: "transparent", fontSize: "12.5px" }}
        language={language}
        showLineNumbers
        style={dark ? vscDarkPlus : vs}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

function StreamingSpeed({ message }: { message: AssistantMessage }) {
  const { t } = useI18n();
  const startedAt = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState(0.3);
  useEffect(() => {
    startedAt.current = Date.now();
    const timer = window.setInterval(
      () =>
        setElapsed(
          Math.max(0.3, (Date.now() - (startedAt.current ?? Date.now())) / 1000),
        ),
      300,
    );
    return () => window.clearInterval(timer);
  }, []);
  const chars = JSON.stringify(message.content).length;
  const tokens = Math.ceil(chars / 4);
  const speed = tokens / elapsed;
  return (
    <span className="ml-2 text-dim">
      ~{tokens} {t.chat.message.tokens} / {speed.toFixed(1)} {t.chat.message.tokensPerSecond}
    </span>
  );
}

function MessageActionMenu({
  canEdit,
  canFork,
  copied,
  copyingText,
  forking,
  onCopied,
  onEdit,
  onFork,
}: {
  canEdit: boolean;
  canFork: boolean;
  copied: boolean;
  copyingText: string;
  forking: boolean;
  onCopied: () => void;
  onEdit: () => void;
  onFork: () => void;
}) {
  const { t } = useI18n();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={t.chat.message.messageActions}
          className="size-7"
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onSelect={() =>
            void copyText(copyingText).then(() => onCopied())
          }
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? t.chat.message.copied : t.chat.message.copy}
        </DropdownMenuItem>
        {canEdit ? (
          <DropdownMenuItem onSelect={onEdit}>
            <PencilLine className="size-3.5" />
            {t.chat.message.editFromHere}
          </DropdownMenuItem>
        ) : null}
        {canFork ? (
          <DropdownMenuItem disabled={forking} onSelect={onFork}>
            <GitFork className="size-3.5" />
            {forking ? t.chat.message.creating : t.chat.message.newSession}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SmallAction({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      aria-label={label}
      className="h-7 gap-1 px-2 text-[10px]"
      disabled={disabled}
      onClick={onClick}
      size="sm"
      title={label}
      type="button"
      variant="ghost"
    >
      {children}
      <span>{label}</span>
    </Button>
  );
}

function MessageTime({ value }: { value: number }) {
  const date = new Date(value);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return (
    <time>
      {date.toLocaleString([], {
        year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
        month: sameDay ? undefined : "short",
        day: sameDay ? undefined : "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}
    </time>
  );
}

function messageText(message: UserMessage) {
  return typeof message.content === "string"
    ? message.content
    : message.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n");
}

function resultText(
  message: ToolResultMessage,
  t: ReturnType<typeof useI18n>["t"],
) {
  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
  return text.trim() && text !== t.chat.message.noOutput
    ? text
    : t.chat.message.noOutput;
}

function toolSummary(input: Record<string, unknown>) {
  const keys = ["command", "path", "file_path", "pattern", "query"];
  const key = keys.find((candidate) => candidate in input) ?? Object.keys(input)[0];
  return key ? String(input[key]).slice(0, 120) : "";
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
}
