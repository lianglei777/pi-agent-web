import type { RefObject } from "react";
import {
  Bot,
  BrainCircuit,
  CircleCheck,
  CircleX,
  LoaderCircle,
  MessageSquare,
  User,
  Wrench,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { mergeClasses } from "@/lib/utils";
import type { AssistantBlock, ChatMessage } from "./chat-types";

const messageHeader =
  "mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground";

const assistantBody =
  "text-sm leading-[1.72] text-primary [&>:first-child]:mt-0 [&>:last-child]:mb-0 [&_p]:my-[0.7em] [&_ul]:my-[0.7em] [&_ol]:my-[0.7em] [&_blockquote]:my-[0.7em] [&_table]:my-[0.7em] [&_ul]:pl-[1.45rem] [&_ol]:pl-[1.45rem] [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-[3px] [&_code]:rounded [&_code]:border [&_code]:border-line [&_code]:bg-panel [&_code]:px-[0.35em] [&_code]:py-[0.12em] [&_code]:font-ui-mono [&_code]:text-[0.88em] [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-[9px] [&_pre]:border [&_pre]:border-line [&_pre]:bg-[var(--tool-bg)] [&_pre]:px-3.5 [&_pre]:py-[13px] [&_pre_code]:border-0 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-line [&_th]:px-[9px] [&_th]:py-1.5 [&_th]:text-left [&_td]:border [&_td]:border-line [&_td]:px-[9px] [&_td]:py-1.5 [&_td]:text-left";

type MessageTimelineProps = {
  messages: ChatMessage[];
  running: boolean;
  scrollerRef: RefObject<HTMLDivElement | null>;
  streamingText: string;
};

export function MessageTimeline({
  messages,
  running,
  scrollerRef,
  streamingText,
}: MessageTimelineProps) {
  return (
    <ScrollArea
      className="min-h-0 flex-1"
      viewportClassName="overscroll-contain [scrollbar-gutter:stable]"
      viewportRef={scrollerRef}
    >
      <div className="mx-auto min-h-full w-full max-w-[820px] px-7 pt-[34px] pb-[190px] max-[640px]:px-[15px] max-[640px]:pt-[25px] max-[640px]:pb-[180px]">
        {messages.length === 0 && !streamingText ? <EmptyChat /> : null}

        {messages.map((message) => (
          <article className="relative mb-[30px]" key={message.id}>
            <MessageHeader
              role={message.role}
              timestamp={message.timestamp}
            />
            {message.role === "user" ? (
              <Card className="ml-auto w-fit max-w-[min(88%,680px)] rounded-[16px_16px_5px_16px] bg-[var(--user-bg)] shadow-none max-[640px]:max-w-[94%]">
                <CardContent className="px-3.5 py-[11px] leading-[1.65] whitespace-pre-wrap">
                {message.content}
                </CardContent>
              </Card>
            ) : (
              <AssistantContent blocks={message.content} />
            )}
          </article>
        ))}

        {running ? (
          <article className="relative mb-[30px]">
            <MessageHeader role="assistant" status="Working" />
            <div className={assistantBody}>
              {streamingText ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {streamingText}
                </ReactMarkdown>
              ) : (
                <span className="text-muted">Thinking...</span>
              )}
              <span className="ml-[3px] inline-block h-[15px] w-[7px] animate-pulse rounded-[1px] bg-accent align-[-2px]" />
            </div>
          </article>
        ) : null}
      </div>
    </ScrollArea>
  );
}

function EmptyChat() {
  return (
    <section className="grid min-h-[calc(100dvh-300px)] place-items-center text-center">
      <Card className="max-w-md border-0 bg-transparent shadow-none">
        <CardContent className="px-6 py-8">
          <div className="mx-auto mb-[18px] grid size-14 place-items-center rounded-2xl border border-border bg-card text-primary shadow-[var(--shadow-soft)]">
            <MessageSquare className="size-6" />
          </div>
          <h1 className="mb-2 text-[19px] font-semibold text-foreground">
          What are we building?
          </h1>
          <p className="m-0 text-[13px] leading-6 text-muted-foreground">
          Ask a question, attach an image, or describe a task.
          <br />
          Enter sends. Shift + Enter adds a new line.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}

function MessageHeader({
  role,
  timestamp,
  status,
}: {
  role: "user" | "assistant";
  timestamp?: number;
  status?: string;
}) {
  return (
    <div
      className={mergeClasses(messageHeader, role === "user" && "justify-end")}
    >
      {role === "user" ? (
        <User className="size-3.5" />
      ) : (
        <Bot className="size-3.5" />
      )}
      <span className="font-semibold tracking-[0.02em] text-muted-foreground">
        {role === "user" ? "You" : "Pi"}
      </span>
      {status ? <span>{status}</span> : null}
      {timestamp ? (
        <time>
          {new Date(timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </time>
      ) : null}
    </div>
  );
}

function AssistantContent({ blocks }: { blocks: AssistantBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        if (block.type === "text") {
          return (
            <div className={assistantBody} key={`text-${index}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {block.text}
              </ReactMarkdown>
            </div>
          );
        }

        if (block.type === "thinking") {
          return (
            <Accordion
              className="my-2.5"
              collapsible
              key={`thinking-${index}`}
              type="single"
            >
              <AccordionItem value="thinking">
                <AccordionTrigger>
                  <BrainCircuit className="size-3.5" />
                  <span>Thinking</span>
                  {block.duration ? (
                    <Badge className="ml-1" variant="outline">
                      {block.duration}
                    </Badge>
                  ) : null}
                </AccordionTrigger>
                <AccordionContent>{block.thinking}</AccordionContent>
              </AccordionItem>
            </Accordion>
          );
        }

        const status = block.isError
          ? "Failed"
          : block.result
            ? "Done"
            : "Running";

        return (
          <Accordion
            className="my-2.5"
            collapsible
            key={block.toolCallId}
            type="single"
          >
            <AccordionItem value={block.toolCallId}>
              <AccordionTrigger>
                <Wrench className="size-3.5" />
                <span className="truncate">{block.toolName}</span>
                <ToolStatusBadge isError={block.isError} status={status} />
              </AccordionTrigger>
              <AccordionContent className="overflow-x-auto">
                {JSON.stringify(block.input, null, 2)}
                {"\n\n"}
                {block.result ?? "(waiting for output)"}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        );
      })}
    </>
  );
}

function ToolStatusBadge({
  isError,
  status,
}: {
  isError?: boolean;
  status: "Done" | "Failed" | "Running";
}) {
  const Icon = isError
    ? CircleX
    : status === "Done"
      ? CircleCheck
      : LoaderCircle;

  return (
    <Badge
      className="ml-auto"
      variant={isError ? "destructive" : status === "Done" ? "success" : "outline"}
    >
      <Icon className={mergeClasses("size-3", status === "Running" && "animate-spin")} />
      {status}
    </Badge>
  );
}
