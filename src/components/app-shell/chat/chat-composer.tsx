import type {
  ClipboardEventHandler,
  Dispatch,
  KeyboardEventHandler,
  RefObject,
  SetStateAction,
} from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ComposerToolbar } from "./composer-toolbar";
import type { AttachedImage, SubmitMode } from "./chat-types";

export type ChatComposerProps = {
  addFiles: (files: File[]) => void;
  canSubmit: boolean;
  draft: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement>;
  handlePaste: ClipboardEventHandler<HTMLTextAreaElement>;
  images: AttachedImage[];
  model: string;
  removeImage: (id: string) => void;
  resizeTextarea: () => void;
  running: boolean;
  setDraft: Dispatch<SetStateAction<string>>;
  setModel: Dispatch<SetStateAction<string>>;
  setThinking: Dispatch<SetStateAction<string>>;
  setToolPreset: Dispatch<SetStateAction<string>>;
  soundEnabled: boolean;
  stop: () => void;
  submit: (mode?: SubmitMode) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  thinking: string;
  toggleSound: () => void;
  toolPreset: string;
};

export function ChatComposer({
  addFiles,
  canSubmit,
  draft,
  fileInputRef,
  handleKeyDown,
  handlePaste,
  images,
  model,
  removeImage,
  resizeTextarea,
  running,
  setDraft,
  setModel,
  setThinking,
  setToolPreset,
  soundEnabled,
  stop,
  submit,
  textareaRef,
  thinking,
  toggleSound,
  toolPreset,
}: ChatComposerProps) {
  return (
    <div className="pointer-events-none absolute right-0 bottom-0 left-0 z-20 bg-[linear-gradient(transparent,var(--bg)_38%)] px-6 pt-11 pb-[18px] max-[640px]:px-2.5 max-[640px]:pt-9 max-[640px]:pb-2.5">
      <div className="pointer-events-auto mx-auto w-full max-w-[780px] overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] transition-[border-color,box-shadow] duration-150 focus-within:border-[color-mix(in_srgb,var(--border)_45%,var(--text))] focus-within:shadow-[var(--shadow-soft),0_0_0_3px_color-mix(in_srgb,var(--text)_7%,transparent)]">
        <AttachmentPreviews images={images} removeImage={removeImage} />

        <Textarea
          aria-label="Message"
          className="block min-h-[58px] max-h-[180px] resize-none overflow-y-auto rounded-none border-0 px-[15px] pt-3.5 pb-2 leading-6 text-primary shadow-none placeholder:text-dim focus-visible:border-transparent focus-visible:ring-0"
          onChange={(event) => {
            setDraft(event.target.value);
            resizeTextarea();
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={
            running
              ? "Add guidance while the agent is working..."
              : "Message Pi Agent..."
          }
          ref={textareaRef}
          rows={1}
          value={draft}
        />

        <ComposerToolbar
          addFiles={addFiles}
          canSubmit={canSubmit}
          fileInputRef={fileInputRef}
          model={model}
          running={running}
          setModel={setModel}
          setThinking={setThinking}
          setToolPreset={setToolPreset}
          soundEnabled={soundEnabled}
          stop={stop}
          submit={submit}
          thinking={thinking}
          toggleSound={toggleSound}
          toolPreset={toolPreset}
        />
      </div>
      <div className="pointer-events-none mx-auto mt-[7px] w-full max-w-[780px] text-center text-[10px] text-dim">
        {running
          ? "Agent is running / Enter steers the current task"
          : `${model} / ${thinking} thinking / ${toolPreset} tools`}
      </div>
    </div>
  );
}

function AttachmentPreviews({
  images,
  removeImage,
}: Pick<ChatComposerProps, "images" | "removeImage">) {
  if (images.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto px-3 pt-2.5">
      {images.map((image) => (
        <div
          className="relative size-[62px] flex-none overflow-hidden rounded-lg border border-line bg-panel"
          key={image.id}
        >
          {/* Object URLs are local previews and are released on removal/send. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={image.file.name}
            className="size-full object-cover"
            src={image.previewUrl}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label={`Remove ${image.file.name}`}
                className="absolute top-[3px] right-[3px] size-[19px] rounded-full bg-black/70 p-0 text-white hover:bg-black/85 hover:text-white"
                onClick={() => removeImage(image.id)}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <X className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remove attachment</TooltipContent>
          </Tooltip>
        </div>
      ))}
    </div>
  );
}
