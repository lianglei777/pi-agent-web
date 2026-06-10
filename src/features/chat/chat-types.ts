export type TextBlock = {
  type: "text";
  text: string;
};

export type ThinkingBlock = {
  type: "thinking";
  thinking: string;
  duration?: string;
};

export type ToolCallBlock = {
  type: "toolCall";
  toolCallId: string;
  toolName: string;
  input: unknown;
  result?: string;
  isError?: boolean;
};

export type AssistantBlock = TextBlock | ThinkingBlock | ToolCallBlock;

export type ChatMessage =
  | {
      id: string;
      role: "user";
      content: string;
      timestamp: number;
    }
  | {
      id: string;
      role: "assistant";
      content: AssistantBlock[];
      timestamp: number;
    };

export type AttachedImage = {
  id: string;
  file: File;
  previewUrl: string;
};

export type SubmitMode = "prompt" | "steer" | "followUp";

