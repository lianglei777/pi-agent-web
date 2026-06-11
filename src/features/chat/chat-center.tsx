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
                className="mx-auto min-h-full w-full max-w-[820px] px-4 pt-4 pb-[190px]"
                ref={(node) => {
                  controller.setContentNode(node);
                  setContentNode(node);
                }}
              >
                {!hasConversation ? <Welcome /> : null}
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
                {controller.agentPhase && !controller.stream.streamingMessage ? (
                  <div className="animate-pulse text-[13px] text-muted">
                    {controller.agentPhase}
                  </div>
                ) : null}
                {controller.running ? <div className="h-[80vh]" /> : null}
              </div>
            </div>
            <ChatMinimap
              content={contentNode}
              messageCount={
                controller.messages.length +
                (controller.stream.streamingMessage ? 1 : 0)
              }
              scroller={scrollerNode}
            />
          </div>
          {controller.actionError ? (
            <div className="absolute right-12 bottom-44 z-30 max-w-sm rounded-lg border border-destructive/30 bg-card p-3 text-xs text-destructive shadow-lg">
              {controller.actionError}
              <Button
                className="ml-2 h-6 px-2 text-[10px]"
                onClick={() => controller.setActionError("")}
                size="sm"
                variant="ghost"
              >
                Dismiss
              </Button>
            </div>
          ) : null}
          <ChatInput {...controller} />
        </>
      )}
    </main>
  );
}

function Welcome() {
  return (
    <section className="grid min-h-[calc(100dvh-260px)] place-items-center text-center">
      <div>
        <div className="font-ui-mono text-sm font-semibold text-primary">
          Pi Agent Web
        </div>
        <h1 className="mt-4 text-2xl font-semibold">What are we building?</h1>
        <p className="mt-2 text-sm text-muted">
          Ask a question, attach images, or describe a task.
        </p>
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
      className={`grid flex-1 place-items-center text-sm ${
        error ? "text-destructive" : "text-muted"
      }`}
    >
      {children}
    </div>
  );
}
