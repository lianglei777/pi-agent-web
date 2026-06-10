import type { ChangeEvent } from "react";
import {
  Paperclip,
  Send,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MODEL_OPTIONS } from "./chat-constants";
import type { ChatComposerProps } from "./chat-composer";

type ComposerToolbarProps = Pick<
  ChatComposerProps,
  | "addFiles"
  | "canSubmit"
  | "fileInputRef"
  | "model"
  | "running"
  | "setModel"
  | "setThinking"
  | "setToolPreset"
  | "soundEnabled"
  | "stop"
  | "submit"
  | "thinking"
  | "toggleSound"
  | "toolPreset"
>;

export function ComposerToolbar({
  addFiles,
  canSubmit,
  fileInputRef,
  model,
  running,
  setModel,
  setThinking,
  setToolPreset,
  soundEnabled,
  stop,
  submit,
  thinking,
  toggleSound,
  toolPreset,
}: ComposerToolbarProps) {
  return (
    <div className="flex min-h-[42px] items-center gap-[5px] px-[7px] pt-[5px] pb-[7px]">
      <input
        accept="image/*"
        className="hidden"
        multiple
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          addFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
        ref={fileInputRef}
        type="file"
      />
      <ToolbarIconButton
        label="Attach images"
        onClick={() => fileInputRef.current?.click()}
      >
        <Paperclip />
      </ToolbarIconButton>
      <Select
        disabled={running}
        onValueChange={setModel}
        value={model}
      >
        <SelectTrigger
          aria-label="Model"
          className="h-[29px] max-w-[150px] border-0 shadow-none max-[640px]:max-w-[105px]"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MODEL_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        disabled={running}
        onValueChange={setThinking}
        value={thinking}
      >
        <SelectTrigger
          aria-label="Thinking level"
          className="h-[29px] max-w-[150px] border-0 shadow-none max-[640px]:hidden"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="auto">Thinking: Auto</SelectItem>
          <SelectItem value="off">Thinking: Off</SelectItem>
          <SelectItem value="low">Thinking: Low</SelectItem>
          <SelectItem value="medium">Thinking: Medium</SelectItem>
          <SelectItem value="high">Thinking: High</SelectItem>
        </SelectContent>
      </Select>
      <Select
        disabled={running}
        onValueChange={setToolPreset}
        value={toolPreset}
      >
        <SelectTrigger
          aria-label="Tool preset"
          className="h-[29px] max-w-[150px] border-0 shadow-none max-[640px]:hidden"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No tools</SelectItem>
          <SelectItem value="default">Default tools</SelectItem>
          <SelectItem value="full">All tools</SelectItem>
        </SelectContent>
      </Select>
      <ToolbarIconButton
        label={soundEnabled ? "Disable sound" : "Enable sound"}
        onClick={toggleSound}
        pressed={soundEnabled}
      >
        {soundEnabled ? <Volume2 /> : <VolumeX />}
      </ToolbarIconButton>
      <div className="flex-1" />

      {running ? (
        <RuntimeActions
          canSubmit={canSubmit}
          stop={stop}
          submit={submit}
        />
      ) : (
        <Button
          aria-label="Send message"
          className="size-[31px] rounded-lg"
          disabled={!canSubmit}
          onClick={() => submit()}
          size="icon-sm"
          type="button"
        >
          <Send />
        </Button>
      )}
    </div>
  );
}

function RuntimeActions({
  canSubmit,
  stop,
  submit,
}: Pick<ChatComposerProps, "canSubmit" | "stop" | "submit">) {
  return (
    <div className="flex items-center gap-[5px]">
      <Button
        className="h-[30px] px-[9px] text-[11px]"
        disabled={!canSubmit}
        onClick={() => submit("followUp")}
        size="sm"
        type="button"
        variant="outline"
      >
        Follow-up
      </Button>
      <Button
        className="h-[30px] px-[9px] text-[11px]"
        disabled={!canSubmit}
        onClick={() => submit("steer")}
        size="sm"
        type="button"
        variant="outline"
      >
        Steer
      </Button>
      <Button
        aria-label="Stop agent"
        className="h-[30px] border-red-600/35 px-[9px] text-[11px] text-red-600 hover:text-red-600"
        onClick={stop}
        size="sm"
        type="button"
        variant="outline"
      >
        <Square className="size-3" /> Stop
      </Button>
    </div>
  );
}

function ToolbarIconButton({
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
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label={label}
          aria-pressed={pressed}
          className="size-[29px]"
          onClick={onClick}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}
