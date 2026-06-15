"use client";

import { type DragEvent, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatInput } from "./chat-input";
import { ChatMinimap } from "./chat-minimap";
import { MessageList } from "./message-view";
import type {
  ContextUsage,
  SessionStats,
  SessionTreeNode,
} from "./agent-types";
import {
  type ChatSession,
  useChatController,
} from "./use-chat-controller";

export function ChatCenter({
  session,
  newSessionCwd,
  onAgentEnd,
  onSessionCreated,
  onSessionForked,
  onBranchDataChange,
  onSystemPromptChange,
  onSessionStatsChange,
  onContextUsageChange,
}: {
  session: ChatSession | null;
  newSessionCwd: string | null;
  onAgentEnd?: () => void;
  onSessionCreated?: (sessionId: string) => void;
  onSessionForked?: (sessionId: string) => void;
  onBranchDataChange?: (
    tree: SessionTreeNode[],
    leafId: string | null,
    onLeafChange: (leafId: string) => void,
  ) => void;
  onSystemPromptChange?: (prompt: string | null) => void;
  onSessionStatsChange?: (stats: SessionStats | null) => void;
  onContextUsageChange?: (usage: ContextUsage | null) => void;
}) {
  const controller = useChatController({
    session,
    newSessionCwd,
    onAgentEnd,
    onSessionCreated,
    onSessionForked,
    onBranchDataChange,
    onSystemPromptChange,
    onSessionStatsChange,
    onContextUsageChange,
  });
  const [dragActive, setDragActive] = useState(false);
  const [scrollerNode, setScrollerNode] = useState<HTMLDivElement | null>(null);
  const [contentNode, setContentNode] = useState<HTMLDivElement | null>(null);
  const dragCounter = useRef(0);

  function hasImages(event: DragEvent<HTMLElement>) {
    return Array.from(event.dataTransfer.items).some(
      (item) => item.kind === "file" && item.type.startsWith("image/"),
    );
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    dragCounter.current = 0;
    setDragActive(false);
    void controller.addFiles(Array.from(event.dataTransfer.files));
  }

  const hasConversation =
    controller.messages.length > 0 ||
    controller.stream.streamingMessage ||
    controller.running;

  return (
    <main
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_50%_0%,color-mix(in_srgb,var(--text)_2.5%,transparent),transparent_30rem),var(--bg)]"
      onDragEnter={(event) => {
        if (!hasImages(event)) return;
        event.preventDefault();
        dragCounter.current += 1;
        setDragActive(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        dragCounter.current -= 1;
        if (dragCounter.current <= 0) {
          dragCounter.current = 0;
          setDragActive(false);
        }
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      {dragActive ? (
        <div className="pointer-events-none absolute inset-3 z-40 grid place-items-center rounded-xl border-2 border-dashed border-blue-500/50 bg-blue-500/8 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 text-sm font-semibold text-primary">
            <ImagePlus className="size-8 text-blue-500" />
            Drop images to attach
          </div>
        </div>
      ) : null}

      {controller.loading ? (
        <CenteredState>Loading session...</CenteredState>
      ) : controller.error ? (
        <CenteredState error>{controller.error}</CenteredState>
      ) : (
        <>
          <div className="relative min-h-0 flex-1">
            <div
              className="size-full overflow-y-auto overscroll-contain [scrollbar-width:none]"
              ref={(node) => {
                controller.setScrollerNode(node);
                setScrollerNode(node);
              }}
            >
              <div
                className="mx-auto min-h-full w-full max-w-[820px] px-4 pt-4 pb-[220px]"
                ref={(node) => {
                  controller.setContentNode(node);
                  setContentNode(node);
                }}
              >
                {!hasConversation ? (
                  <Welcome
                    onSelectPrompt={(prompt) => {
                      controller.setDraft(prompt);
                      window.requestAnimationFrame(() => {
                        controller.textareaRef.current?.focus();
                        controller.resizeTextarea();
                      });
                    }}
                  />
                ) : null}
                
                {/* message list */}
                <MessageList
                  entryIds={controller.entryIds}
                  forkingEntryId={controller.forkingEntryId}
                  lastUserRef={controller.lastUserRef}
                  messages={controller.messages}
                  onEdit={(targetId, text) =>
                    void controller.editFromHere(targetId, text)
                  }
                  onFork={(entryId) => void controller.fork(entryId)}
                  running={controller.running}
                  streamingMessage={controller.stream.streamingMessage}
                />


                {controller.running ? <div className="h-[80vh]" /> : null}
              </div>
            </div>

            {/* chat mini map */}
            <ChatMinimap
              content={contentNode}
              messageCount={
                controller.messages.length +
                (controller.stream.streamingMessage ? 1 : 0)
              }
              scroller={scrollerNode}
            />
          </div>

          {/* 错误提示 */}
          {/* chat 输入框 */}
          <ChatInput {...controller} />
        </>
      )}
    </main>
  );
}

const STARTER_PROMPTS = [
  "Explain the architecture of this project",
  "Find and fix a bug in the current workspace",
  "Add a focused test for an important workflow",
  "Review the latest changes for regressions",
];

function Welcome({
  onSelectPrompt,
}: {
  onSelectPrompt: (prompt: string) => void;
}) {
  return (
    <section className="grid min-h-[calc(100dvh-280px)] place-items-center px-3 py-12">
      <div className="w-full max-w-xl text-center">
        <div className="font-ui-mono text-xs font-semibold tracking-wide text-muted">
          Pi Agent Web
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-primary max-[640px]:text-2xl">
          What should we work on?
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
          Ask a question, attach a screenshot, or choose a starting point.
        </p>
        <div className="mt-7 grid grid-cols-2 gap-2 text-left max-[560px]:grid-cols-1">
          {STARTER_PROMPTS.map((prompt) => (
            <Button
              className="h-auto min-h-12 justify-start whitespace-normal rounded-xl px-3 py-2.5 text-left text-xs leading-5"
              key={prompt}
              onClick={() => onSelectPrompt(prompt)}
              type="button"
              variant="outline"
            >
              {prompt}
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}

function CenteredState({
  children,
  error = false,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={`grid flex-1 place-items-center text-sm ${error ? "text-destructive" : "text-muted"
        }`}
    >
      {children}
    </div>
  );
}
