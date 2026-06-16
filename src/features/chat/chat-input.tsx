"use client";

import type {
  ChangeEvent,
  ClipboardEventHandler,
  KeyboardEventHandler,
  Ref,
  RefObject,
} from "react";
import {
  Brain,
  Clock3,
  Cpu,
  Minimize2,
  Paperclip,
  Send,
  Settings2,
  Square,
  Volume2,
  VolumeX,
  Wrench,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/use-i18n";
import type {
  AttachedImage,
  ModelInfo,
  ThinkingLevel,
} from "./agent-types";
import { TOOL_PRESETS } from "./chat-logic";

type ToolPreset = keyof typeof TOOL_PRESETS;

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
  actionError,
  retryInfo,
  agentPhase,
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
  setActionError,
  rootRef,
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
  toolPreset: ToolPreset;
  soundEnabled: boolean;
  isCompacting: boolean;
  compactError: string;
  actionError: string;
  retryInfo: {
    attempt: number;
    maxAttempts: number;
    errorMessage?: string;
  } | null;
  agentPhase: string | null;
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
  changeTools: (value: ToolPreset) => Promise<void>;
  compact: () => Promise<void>;
  toggleSound: () => void;
  handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement>;
  handlePaste: ClipboardEventHandler<HTMLTextAreaElement>;
  setActionError: (value: string) => void;
  rootRef?: Ref<HTMLDivElement>;
}) {
  const { t } = useI18n();
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
  ].filter(
    (value, index, array) => array.indexOf(value) === index,
  ) as ThinkingLevel[];
  const shortcut = running
    ? t.chat.input.shortcutRunning
    : t.chat.input.shortcutIdle;

  return (
    <div
      className="pointer-events-none absolute right-9 bottom-0 left-0 z-20 bg-[linear-gradient(transparent,var(--bg)_26%)] px-4 pt-14 pb-2 max-[640px]:right-0 max-[640px]:px-2 max-[640px]:pb-2"
      ref={rootRef}
    >
      <div className="pointer-events-auto mx-auto max-w-[820px]">
        {retryInfo ? (
          <InlineStatus tone="warning">
            {t.chat.input.retrying} {retryInfo.attempt}/{retryInfo.maxAttempts}
            {retryInfo.errorMessage ? ` · ${retryInfo.errorMessage}` : ""}
          </InlineStatus>
        ) : null}
        {compactError ? (
          <InlineStatus tone="error">{compactError}</InlineStatus>
        ) : null}
        {actionError ? (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-destructive/25 bg-card px-3 py-2 text-xs text-destructive shadow-sm">
            <span className="min-w-0 flex-1">{actionError}</span>
            <Button
              aria-label={t.chat.input.dismissError}
              className="size-6"
              onClick={() => setActionError("")}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ) : null}

        <div
          className={`overflow-hidden rounded-[20px] border bg-card shadow-[var(--shadow-composer)] transition-[border-color,box-shadow] ${
            running
              ? "border-text-muted/40 shadow-[var(--shadow-composer-active)]"
              : "border-border"
          }`}
        >
          {running && agentPhase ? (
            <div
              aria-live="polite"
              className="flex items-center gap-2 border-b border-line/60 px-4 py-2 text-[11px] text-muted"
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-text-muted/50" />
                <span className="relative inline-flex size-2 rounded-full bg-text-muted" />
              </span>
              <span className="truncate">{agentPhase}</span>
            </div>
          ) : null}

          {images.length ? (
            <div className="flex gap-2 overflow-x-auto px-4 pt-3">
              {images.map((image) => (
                <div
                  className="relative size-16 flex-none overflow-hidden rounded-lg border border-line bg-panel"
                  key={image.id}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={image.name}
                    className="size-full object-cover"
                    src={image.previewUrl}
                  />
                  <Button
                    aria-label={`${t.chat.input.removeImage} ${image.name}`}
                    className="absolute top-1 right-1 size-5 rounded-full bg-[var(--text)]/70 p-0 text-[var(--bg-panel)] hover:bg-[var(--text)]/85"
                    onClick={() => removeImage(image.id)}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : null}

          <Textarea
            aria-describedby="composer-shortcut"
            aria-label={t.chat.input.messageLabel}
            className="min-h-[72px] max-h-[220px] resize-none overflow-y-auto rounded-none border-0 bg-transparent px-4 pt-4 pb-2 text-[15px] leading-[1.6] shadow-none placeholder:text-dim focus-visible:border-0 focus-visible:ring-0"
            onChange={(event) => {
              setDraft(event.target.value);
              resizeTextarea();
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              running
                ? t.chat.input.placeholderRunning
                : t.chat.input.placeholderIdle
            }
            ref={textareaRef}
            rows={1}
            value={draft}
          />

          <div className="flex min-h-12 items-center gap-1.5 px-2.5 pb-2">
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
              label={t.chat.input.attachImages}
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip />
            </IconButton>

            <Select
              disabled={running}
              onValueChange={(value) => void changeModel(value)}
              value={modelKey}
            >
              <SelectTrigger
                aria-label={t.chat.input.model}
                className="h-9 max-w-52 border-0 bg-transparent px-2 shadow-none hover:bg-hover max-[480px]:max-w-36"
              >
                <Cpu className="size-3.5 opacity-60" />
                <span className="truncate">
                  {currentModel?.name ?? t.chat.input.chooseModel}
                </span>
              </SelectTrigger>
              <SelectContent side="top">
                {models.map((model) => (
                  <SelectItem
                    key={`${model.provider}:${model.id}`}
                    value={`${model.provider}:${model.id}`}
                  >
                    {model.name} · {model.provider}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex-1" />

            {running ? (
              <>
                <Button
                  className="h-9 px-2.5 text-xs max-[520px]:px-2"
                  disabled={!canSubmit}
                  onClick={() => void submit("follow_up")}
                  size="sm"
                  title={t.chat.input.queueTitle}
                  type="button"
                  variant="outline"
                >
                  <Clock3 />
                  <span className="max-[520px]:sr-only">
                    {t.chat.input.queue}
                  </span>
                </Button>
                <Button
                  className="h-9 px-3 text-xs"
                  disabled={!canSubmit}
                  onClick={() => void submit("steer")}
                  size="sm"
                  title={t.chat.input.steerTitle}
                  type="button"
                >
                  <Send />
                  <span className="max-[420px]:sr-only">
                    {t.chat.input.steer}
                  </span>
                </Button>
                <Button
                  aria-label={
                    stopping
                      ? t.chat.input.stoppingAgent
                      : t.chat.input.stopAgent
                  }
                  className="size-9 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={stopping}
                  onClick={() => void stop()}
                  size="icon"
                  title={stopping ? t.chat.input.stopping : t.chat.input.stop}
                  type="button"
                  variant="outline"
                >
                  <Square className="size-3.5 fill-current" />
                </Button>
              </>
            ) : (
              <Button
                aria-label={t.chat.input.sendMessage}
                className="h-9 min-w-24 rounded-lg px-4 text-xs max-[480px]:min-w-9 max-[480px]:px-0"
                disabled={!canSubmit}
                onClick={() => void submit()}
                size="sm"
                type="button"
              >
                <Send />
                <span className="max-[480px]:sr-only">
                  {t.chat.input.send}
                </span>
              </Button>
            )}
          </div>

          <div className="flex min-h-9 items-center gap-1 border-t border-line/55 bg-[var(--bg-subtle)] px-2.5 text-[11px] text-muted">
            <div className="flex items-center gap-1 max-[700px]:hidden">
              <CompactSelect
                icon={<Brain />}
                label={t.chat.input.thinking}
                onValueChange={(value) =>
                  void changeThinking(value as ThinkingLevel)
                }
                options={thinkingOptions.map((level) => ({
                  label: level,
                  value: level,
                }))}
                value={thinkingLevel}
              />
              <CompactSelect
                icon={<Wrench />}
                label={t.chat.input.tools}
                onValueChange={(value) =>
                  void changeTools(value as ToolPreset)
                }
                options={[
                  { label: "off", value: "none" },
                  { label: "default", value: "default" },
                  { label: "full", value: "full" },
                ]}
                value={toolPreset}
              />
              <Button
                className="h-7 gap-1.5 px-2 text-[11px]"
                disabled={running}
                onClick={() => void compact()}
                size="sm"
                title={t.chat.input.compactContext}
                type="button"
                variant="ghost"
              >
                <Minimize2 className="size-3.5" />
                {isCompacting
                  ? t.chat.input.abortCompact
                  : t.chat.input.compact}
              </Button>
              <IconButton
                className="size-7"
                label={
                  soundEnabled
                    ? t.chat.input.disableSound
                    : t.chat.input.enableSound
                }
                onClick={toggleSound}
                pressed={soundEnabled}
              >
                {soundEnabled ? <Volume2 /> : <VolumeX />}
              </IconButton>
            </div>

            <div className="min-[701px]:hidden">
              <SettingsMenu
                isCompacting={isCompacting}
                onCompact={compact}
                onSoundChange={toggleSound}
                onThinkingChange={changeThinking}
                onToolsChange={changeTools}
                running={running}
                soundEnabled={soundEnabled}
                thinkingLevel={thinkingLevel}
                thinkingOptions={thinkingOptions}
                toolPreset={toolPreset}
              />
            </div>

            <span
              className="ml-auto truncate text-[10px] text-dim max-[520px]:hidden"
              id="composer-shortcut"
            >
              {shortcut}
            </span>
          </div>
        </div>
        <p className="mt-2 text-center text-[11px] leading-5 text-dim">
          {t.chat.input.disclaimer}
        </p>
      </div>
    </div>
  );
}

function InlineStatus({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "warning" | "error";
}) {
  return (
    <div
      aria-live="polite"
      className={`mb-2 rounded-lg border px-3 py-2 text-xs shadow-sm ${
        tone === "warning"
          ? "border-text-muted/25 bg-[var(--bg-subtle)] text-muted"
          : "border-destructive/25 bg-destructive/8 text-destructive"
      }`}
    >
      {children}
    </div>
  );
}

function CompactSelect({
  icon,
  label,
  value,
  options,
  onValueChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onValueChange: (value: string) => void;
}) {
  return (
    <Select onValueChange={onValueChange} value={value}>
      <SelectTrigger
        aria-label={label}
        className="h-7 max-w-36 border-0 bg-transparent px-2 text-[11px] shadow-none hover:bg-hover"
      >
        {icon}
        <span className="truncate">
          {label}: {value}
        </span>
      </SelectTrigger>
      <SelectContent side="top">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {label}: {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SettingsMenu({
  thinkingLevel,
  thinkingOptions,
  toolPreset,
  soundEnabled,
  isCompacting,
  running,
  onThinkingChange,
  onToolsChange,
  onSoundChange,
  onCompact,
}: {
  thinkingLevel: ThinkingLevel;
  thinkingOptions: ThinkingLevel[];
  toolPreset: ToolPreset;
  soundEnabled: boolean;
  isCompacting: boolean;
  running: boolean;
  onThinkingChange: (value: ThinkingLevel) => Promise<void>;
  onToolsChange: (value: ToolPreset) => Promise<void>;
  onSoundChange: () => void;
  onCompact: () => Promise<void>;
}) {
  const { t } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={t.chat.input.agentSettings}
          className="h-7 px-2 text-[11px]"
          size="sm"
          type="button"
          variant="ghost"
        >
          <Settings2 className="size-3.5" />
          {t.chat.input.settings}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top">
        <DropdownMenuLabel>{t.chat.input.agentSettings}</DropdownMenuLabel>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Brain className="size-3.5" />
            {t.chat.input.thinking}: {thinkingLevel}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              onValueChange={(value) =>
                void onThinkingChange(value as ThinkingLevel)
              }
              value={thinkingLevel}
            >
              {thinkingOptions.map((level) => (
                <DropdownMenuRadioItem key={level} value={level}>
                  {level}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Wrench className="size-3.5" />
            {t.chat.input.tools}: {toolPreset}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              onValueChange={(value) =>
                void onToolsChange(value as ToolPreset)
              }
              value={toolPreset}
            >
              <DropdownMenuRadioItem value="none">off</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="default">
                default
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="full">full</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={soundEnabled}
          onCheckedChange={onSoundChange}
        >
          {t.chat.input.completionSound}
        </DropdownMenuCheckboxItem>
        <DropdownMenuItem
          disabled={running}
          onSelect={() => void onCompact()}
        >
          <Minimize2 className="size-3.5" />
          {isCompacting
            ? t.chat.input.abortCompact
            : t.chat.input.compactContext}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function IconButton({
  children,
  label,
  onClick,
  pressed,
  className = "size-9",
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  pressed?: boolean;
  className?: string;
}) {
  return (
    <Button
      aria-label={label}
      aria-pressed={pressed}
      className={className}
      onClick={onClick}
      size="icon-sm"
      title={label}
      type="button"
      variant="ghost"
    >
      {children}
    </Button>
  );
}
