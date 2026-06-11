"use client";

import type {
  ChangeEvent,
  ClipboardEventHandler,
  KeyboardEventHandler,
  RefObject,
} from "react";
import {
  Box,
  Paperclip,
  Send,
  Square,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  AttachedImage,
  ModelInfo,
  ThinkingLevel,
} from "./agent-types";
import { TOOL_PRESETS } from "./chat-logic";

export function ChatInput({
  draft,
  images,
  running,
  stopping,
  canSubmit,
  models,
  modelKey,
  currentModel,
  thinkingLevel,
  toolPreset,
  soundEnabled,
  isCompacting,
  compactError,
  retryInfo,
  textareaRef,
  fileInputRef,
  setDraft,
  resizeTextarea,
  addFiles,
  removeImage,
  submit,
  stop,
  changeModel,
  changeThinking,
  changeTools,
  compact,
  toggleSound,
  handleKeyDown,
  handlePaste,
}: {
  draft: string;
  images: AttachedImage[];
  running: boolean;
  stopping: boolean;
  canSubmit: boolean;
  models: ModelInfo[];
  modelKey: string;
  currentModel?: ModelInfo;
  thinkingLevel: ThinkingLevel;
  toolPreset: keyof typeof TOOL_PRESETS;
  soundEnabled: boolean;
  isCompacting: boolean;
  compactError: string;
  retryInfo: {
    attempt: number;
    maxAttempts: number;
    errorMessage?: string;
  } | null;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  setDraft: (value: string) => void;
  resizeTextarea: () => void;
  addFiles: (files: File[]) => Promise<void>;
  removeImage: (id: string) => void;
  submit: (mode?: "prompt" | "steer" | "follow_up") => Promise<void>;
  stop: () => Promise<void>;
  changeModel: (value: string) => Promise<void>;
  changeThinking: (value: ThinkingLevel) => Promise<void>;
  changeTools: (value: keyof typeof TOOL_PRESETS) => Promise<void>;
  compact: () => Promise<void>;
  toggleSound: () => void;
  handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement>;
  handlePaste: ClipboardEventHandler<HTMLTextAreaElement>;
}) {
  const thinkingOptions = [
    "auto",
    ...(currentModel?.thinkingLevels ?? [
      "off",
      "minimal",
      "low",
      "medium",
      "high",
      "xhigh",
    ]),
  ].filter((value, index, array) => array.indexOf(value) === index) as ThinkingLevel[];

  return (
    <div className="pointer-events-none absolute right-9 bottom-0 left-0 z-20 bg-[linear-gradient(transparent,var(--bg)_30%)] px-4 pt-12 pb-4 max-[640px]:right-0 max-[640px]:px-2">
      {retryInfo ? (
        <div className="pointer-events-auto mx-auto mb-2 max-w-[820px] rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-700 dark:text-yellow-300">
          Retrying ({retryInfo.attempt}/{retryInfo.maxAttempts})
          {retryInfo.errorMessage ? ` - ${retryInfo.errorMessage}` : ""}
        </div>
      ) : null}
      {compactError ? (
        <div className="pointer-events-auto mx-auto mb-2 max-w-[820px] text-xs text-destructive">
          {compactError}
        </div>
      ) : null}
      <div
        className={`pointer-events-auto mx-auto max-w-[820px] overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-soft)] ${
          running ? "border-yellow-500/45" : "border-border"
        }`}
      >
        {images.length ? (
          <div className="flex gap-2 overflow-x-auto px-3 pt-2.5">
            {images.map((image) => (
              <div
                className="relative size-14 flex-none overflow-hidden rounded-lg border border-line bg-panel"
                key={image.id}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={image.name}
                  className="size-full object-cover"
                  src={image.previewUrl}
                />
                <Button
                  aria-label={`Remove ${image.name}`}
                  className="absolute top-0.5 right-0.5 size-5 rounded-full bg-black/70 p-0 text-white"
                  onClick={() => removeImage(image.id)}
                  size="icon-sm"
                  variant="ghost"
                >
                  <X className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : null}
        <Textarea
          aria-label="Message"
          className="min-h-[58px] max-h-[200px] resize-none overflow-y-auto rounded-none border-0 px-4 pt-3.5 pb-2 text-sm leading-[1.6] shadow-none focus-visible:ring-0"
          onChange={(event) => {
            setDraft(event.target.value);
            resizeTextarea();
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={
            running
              ? "Steer immediately / queue a follow-up..."
              : "Message..."
          }
          ref={textareaRef}
          rows={1}
          value={draft}
        />
        <div className="flex min-h-11 items-center gap-1 border-t border-line/60 px-2 py-1.5">
          <input
            accept="image/*"
            className="hidden"
            multiple
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              void addFiles(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
            ref={fileInputRef}
            type="file"
          />
          <IconButton
            label="Attach images"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip />
          </IconButton>
          <Select disabled={running} onValueChange={(value) => void changeModel(value)} value={modelKey}>
            <SelectTrigger aria-label="Model" className="h-8 max-w-44 border-0 shadow-none">
              <SelectValue placeholder="No models" />
            </SelectTrigger>
            <SelectContent side="top">
              {models.map((model) => (
                <SelectItem
                  key={`${model.provider}:${model.id}`}
                  value={`${model.provider}:${model.id}`}
                >
                  {model.name} ({model.provider})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!running ? (
            <>
              <Select
                onValueChange={(value) => void changeThinking(value as ThinkingLevel)}
                value={thinkingLevel}
              >
                <SelectTrigger aria-label="Thinking level" className="h-8 max-w-32 border-0 shadow-none max-[700px]:hidden">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent side="top">
                  {thinkingOptions.map((level) => (
                    <SelectItem key={level} value={level}>
                      Thinking: {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                onValueChange={(value) =>
                  void changeTools(value as keyof typeof TOOL_PRESETS)
                }
                value={toolPreset}
              >
                <SelectTrigger aria-label="Tool preset" className="h-8 max-w-28 border-0 shadow-none max-[760px]:hidden">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent side="top">
                  <SelectItem value="none">Tools off</SelectItem>
                  <SelectItem value="default">Tools default</SelectItem>
                  <SelectItem value="full">Tools full</SelectItem>
                </SelectContent>
              </Select>
              <Button
                className={`h-8 px-2 text-[11px] ${isCompacting ? "text-destructive" : ""}`}
                onClick={() => void compact()}
                size="sm"
                variant="ghost"
              >
                <Box className="size-3.5" />
                {isCompacting ? "Abort compact" : "Compact"}
              </Button>
            </>
          ) : null}
          <IconButton
            label={soundEnabled ? "Disable sound" : "Enable sound"}
            onClick={toggleSound}
            pressed={soundEnabled}
          >
            {soundEnabled ? <Volume2 /> : <VolumeX />}
          </IconButton>
          <div className="flex-1" />
          {running ? (
            <>
              <Button
                className="h-8 px-2 text-[11px]"
                disabled={!canSubmit}
                onClick={() => void submit("follow_up")}
                size="sm"
                variant="outline"
              >
                Follow-up
              </Button>
              <Button
                className="h-8 px-2 text-[11px]"
                disabled={!canSubmit}
                onClick={() => void submit("steer")}
                size="sm"
                variant="outline"
              >
                Steer
              </Button>
              <Button
                className="h-8 border-destructive/30 px-2 text-[11px] text-destructive"
                disabled={stopping}
                onClick={() => void stop()}
                size="sm"
                variant="outline"
              >
                <Square className="size-3" />
                {stopping ? "Stopping..." : "Stop"}
              </Button>
            </>
          ) : (
            <Button
              aria-label="Send message"
              className="size-8"
              disabled={!canSubmit}
              onClick={() => void submit()}
              size="icon-sm"
            >
              <Send />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function IconButton({
  children,
  label,
  onClick,
  pressed,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  pressed?: boolean;
}) {
  return (
    <Button
      aria-label={label}
      aria-pressed={pressed}
      className="size-8"
      onClick={onClick}
      size="icon-sm"
      title={label}
      variant="ghost"
    >
      {children}
    </Button>
  );
}
