export const THINKING_LEVELS = [
  "auto",
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
] as const;

export type ThinkingLevel = (typeof THINKING_LEVELS)[number];

export interface ImageInput {
  type: "image";
  data: string;
  mimeType: string;
}

export type AgentCommand =
  | { type: "prompt"; message: string; images?: ImageInput[] }
  | { type: "abort" }
  | { type: "get_state" }
  | { type: "set_model"; provider: string; modelId: string }
  | { type: "fork"; entryId: string }
  | { type: "navigate_tree"; targetId: string }
  | { type: "set_thinking_level"; level: ThinkingLevel }
  | { type: "compact"; customInstructions?: string }
  | { type: "set_auto_compaction"; enabled: boolean }
  | { type: "steer"; message: string; images?: ImageInput[] }
  | { type: "follow_up"; message: string; images?: ImageInput[] }
  | { type: "get_tools" }
  | { type: "set_tools"; toolNames: string[] }
  | { type: "abort_compaction" }
  | { type: "set_auto_retry"; enabled: boolean };

