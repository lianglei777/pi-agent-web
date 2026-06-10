"use client";

import { type DragEvent, useState } from "react";
import { ImagePlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ChatComposer } from "./chat-composer";
import { MessageTimeline } from "./message-timeline";
import { useChatController } from "./use-chat-controller";

export function ChatCenter({
  onSessionStart,
}: {
  onSessionStart?: () => void;
}) {
  const {
    messages,
    draft,
    images,
    streamingText,
    running,
    model,
    thinking,
    toolPreset,
    soundEnabled,
    canSubmit,
    textareaRef,
    scrollerRef,
    fileInputRef,
    setDraft,
    setModel,
    setThinking,
    setToolPreset,
    resizeTextarea,
    addFiles,
    removeImage,
    submit,
    stop,
    handleKeyDown,
    handlePaste,
    toggleSound,
  } = useChatController(onSessionStart);
  const [dragActive, setDragActive] = useState(false);

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragActive(false);
    addFiles(Array.from(event.dataTransfer.files));
  }

  return (
    <main
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_50%_0%,color-mix(in_srgb,var(--text)_2.5%,transparent),transparent_30rem),var(--bg)]"
      onDragEnter={(event) => {
        event.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={(event) => {
        if (
          !(event.relatedTarget instanceof Node) ||
          !event.currentTarget.contains(event.relatedTarget)
        ) {
          setDragActive(false);
        }
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      {dragActive ? (
        <div className="pointer-events-none absolute inset-3 z-40 grid place-items-center rounded-xl border-2 border-dashed border-accent bg-[color-mix(in_srgb,var(--bg)_88%,transparent)]">
          <Card className="border-0 bg-transparent text-accent shadow-none">
            <CardContent className="flex flex-col items-center gap-2 p-6 font-semibold">
              <ImagePlus className="size-7" />
              Drop images to attach
            </CardContent>
          </Card>
        </div>
      ) : null}
      <MessageTimeline
        messages={messages}
        running={running}
        scrollerRef={scrollerRef}
        streamingText={streamingText}
      />
      <ChatComposer
        addFiles={addFiles}
        canSubmit={canSubmit}
        draft={draft}
        fileInputRef={fileInputRef}
        handleKeyDown={handleKeyDown}
        handlePaste={handlePaste}
        images={images}
        model={model}
        removeImage={removeImage}
        resizeTextarea={resizeTextarea}
        running={running}
        setDraft={setDraft}
        setModel={setModel}
        setThinking={setThinking}
        setToolPreset={setToolPreset}
        soundEnabled={soundEnabled}
        stop={stop}
        submit={submit}
        textareaRef={textareaRef}
        thinking={thinking}
        toggleSound={toggleSound}
        toolPreset={toolPreset}
      />
    </main>
  );
}
