"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
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
import type {
  AgentMessage,
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
  onFork,
  onEdit,
}: {
  messages: AgentMessage[];
  entryIds: string[];
  streamingMessage: Partial<AssistantMessage> | null;
  running: boolean;
  forkingEntryId: string | null;
  lastUserRef: React.MutableRefObject<HTMLElement | null>;
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
        const isLastUser =
          message.role === "user" &&
          !visible.slice(visibleIndex + 1).some((item) => item.message.role === "user");
        return (
          <article
            className="group relative mb-8 scroll-mt-4"
            data-message-role={message.role}
            key={entryId ?? `${message.role}-${index}-${message.timestamp ?? 0}`}
            ref={isLastUser ? lastUserRef : undefined}
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

      {/* 正在流方式输出内容 */}
      {streamingMessage ? (
        <article
          className="relative mb-8"
          data-message-role="assistant"
          data-streaming="true"
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
  const blocks =
    typeof message.content === "string"
      ? [{ type: "text" as const, text: message.content }]
      : message.content;
  return (
    <div className="flex flex-col items-end">
      <div className="max-w-[76%] rounded-2xl rounded-br-md border border-blue-500/10 bg-[var(--user-bg)] px-3.5 py-2.5 text-sm leading-[1.65] break-words whitespace-pre-wrap shadow-[0_1px_1px_rgba(0,0,0,0.025)] max-[640px]:max-w-[90%]">
        <div className="flex flex-wrap gap-2">

          {/* image content */}
          {blocks
            .filter((block) => block.type === "image")
            .map((block, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="Attached image"
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
          <Badge variant="destructive">Failed</Badge>
        ) : null}

        <div className="hidden items-center gap-1 min-[641px]:flex">
          <SmallAction
            label={copied ? "Copied" : "Copy"}
            onClick={() => void copyText(messageText(message)).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            })}
          >
            {copied ? <Check /> : <Copy />}
          </SmallAction>
          {canEdit && !running ? (
            <SmallAction label="Edit from here" onClick={onEdit}>
              <PencilLine />
            </SmallAction>
          ) : null}
          {canFork && entryId && !running ? (
            <SmallAction
              disabled={forking}
              label={forking ? "Creating..." : "New session"}
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
        
        {/* 对话传输速度 */}
        {streaming ? <StreamingSpeed message={message} /> : null}
      </div>


      {/* 助手回复内容 */}
      {message.content.map((block, index) => {
        // 以 markdown 形式展示 模型返回的文字内容
        if (block.type === "text") {
          return <Markdown key={index} text={block.text} />;
        }

        // 思考内容
        if (block.type === "thinking") {
          return (
            <Accordion className="my-1.5" collapsible key={index} type="single">
              <AccordionItem value="thinking">
                <AccordionTrigger>Thinking</AccordionTrigger>
                <AccordionContent>{block.thinking}</AccordionContent>
              </AccordionItem>
            </Accordion>
          );
        }

        // 图片
        if (block.type === "image") {
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt="Assistant image"
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
              className={result?.isError ? "border-destructive/40" : "border-green-600/25"}
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
                  {result?.isError ? "Error" : result ? "Done" : "Running"}
                </Badge>
              </AccordionTrigger>
              <AccordionContent className="max-h-[400px] overflow-auto">
                {JSON.stringify(block.input, null, 2)}
                {"\n\n"}
                {result ? resultText(result) : "(waiting for output)"}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        );
      })}

      {!streaming ? (
        <div className="mt-2 flex min-h-7 items-center gap-2 text-[10px] text-dim opacity-100 transition-opacity min-[641px]:opacity-0 min-[641px]:group-hover:opacity-100 min-[641px]:group-focus-within:opacity-100">
          
          {message.usage ? (
            <span>
              in {message.usage.input} / out {message.usage.output} / cache{" "}
              {message.usage.cacheRead} / ${message.usage.cost.total.toFixed(4)}
            </span>
          ) : null}

          {text ? (
            <SmallAction
              label={copied ? "Copied" : "Copy"}
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

function Markdown({ text }: { text: string }) {
  return (
    <div className="text-sm leading-[1.7] text-primary [&_a]:text-accent [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-line [&_blockquote]:pl-3 [&_code]:font-ui-mono [&_li]:my-1 [&_ol]:my-3 [&_ol]:pl-6 [&_p]:my-3 [&_table]:my-3 [&_table]:w-full [&_td]:border [&_td]:border-line [&_td]:p-2 [&_th]:border [&_th]:border-line [&_th]:p-2 [&_ul]:my-3 [&_ul]:pl-6">
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
  const dark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");
  return (
    <div className="my-3 overflow-hidden rounded-lg border border-line bg-[var(--tool-bg)]">
      <div className="flex h-8 items-center border-b border-line px-3 text-[10px] text-muted">
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
          {copied ? "Copied" : "Copy"}
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
  const color =
    speed >= 50
      ? "text-cyan-500"
      : speed >= 30
        ? "text-green-500"
        : speed >= 15
          ? "text-yellow-500"
          : "text-red-500";
  return (
    <span className={`ml-2 ${color}`}>
      ~{tokens} tokens / {speed.toFixed(1)} tok/s
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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Message actions"
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
          {copied ? "Copied" : "Copy"}
        </DropdownMenuItem>
        {canEdit ? (
          <DropdownMenuItem onSelect={onEdit}>
            <PencilLine className="size-3.5" />
            Edit from here
          </DropdownMenuItem>
        ) : null}
        {canFork ? (
          <DropdownMenuItem disabled={forking} onSelect={onFork}>
            <GitFork className="size-3.5" />
            {forking ? "Creating..." : "New session"}
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

function resultText(message: ToolResultMessage) {
  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
  return text.trim() && text !== "(no output)" ? text : "(no output)";
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
