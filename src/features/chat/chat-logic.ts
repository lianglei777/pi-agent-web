import type {
  AgentEvent,
  AgentMessage,
  AssistantMessage,
  SessionStats,
  ToolResultMessage,
} from "./agent-types";

export type StreamingState = {
  isStreaming: boolean;
  streamingMessage: Partial<AssistantMessage> | null;
};

export function streamReducer(
  state: StreamingState,
  action:
    | { type: "start" | "end" | "reset" }
    | { type: "update"; message: Partial<AssistantMessage> },
): StreamingState {
  if (action.type === "start") return { isStreaming: true, streamingMessage: null };
  if (action.type === "update") {
    return { isStreaming: true, streamingMessage: normalizeAssistant(action.message) };
  }
  return { isStreaming: false, streamingMessage: null };
}
export function normalizeAssistant(
  message: Partial<AssistantMessage>,
): Partial<AssistantMessage> {
  return {
    ...message,
    content: (message.content ?? []).map((block) => {
      if (block.type !== "toolCall") return block;
      const value = block as typeof block & {
        id?: string;
        name?: string;
        arguments?: Record<string, unknown>;
      };
      return {
        type: "toolCall",
        toolCallId: value.toolCallId ?? value.id ?? cryptoId(),
        toolName: value.toolName ?? value.name ?? "tool",
        input: value.input ?? value.arguments ?? {},
      };
    }),
  };
}

function cryptoId() {
  return typeof crypto === "undefined" ? "tool" : crypto.randomUUID();
}

export function toolResults(messages: AgentMessage[]) {
  return new Map(
    messages
      .filter((message): message is ToolResultMessage => message.role === "toolResult")
      .map((message) => [message.toolCallId, message]),
  );
}

export function sessionStats(messages: AgentMessage[]): SessionStats | null {
  const stats = messages.reduce<SessionStats>(
    (total, message) => {
      if (message.role !== "assistant" || !message.usage) return total;
      total.input += message.usage.input;
      total.output += message.usage.output;
      total.cacheRead += message.usage.cacheRead;
      total.cacheWrite += message.usage.cacheWrite;
      total.cost += message.usage.cost.total;
      return total;
    },
    { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 },
  );
  return Object.values(stats).every((value) => value === 0) ? null : stats;
}

export function phaseLabel(
  runningTools: Array<{ toolCallId: string; toolName: string }>,
  running: boolean,
) {
  if (!running) return null;
  if (!runningTools.length) return "Waiting for model...";
  const names = runningTools.map((tool) => tool.toolName);
  if (names.length === 1) return `Running ${names[0]}...`;
  if (names.length <= 3) return `Running ${names.join(", ")}...`;
  return `Running ${names.slice(0, 2).join(", ")} (+${names.length - 2})...`;
}

export function reduceAgentEvent(
  state: {
    running: boolean;
    stream: StreamingState;
    runningTools: Array<{ toolCallId: string; toolName: string }>;
  },
  event: AgentEvent,
) {
  switch (event.type) {
    case "agent_start":
      return { ...state, running: true, stream: streamReducer(state.stream, { type: "start" }) };
    case "message_start":
    case "message_update":
      return {
        ...state,
        stream: streamReducer(state.stream, { type: "update", message: event.message }),
      };
    case "message_end":
      return { ...state, stream: streamReducer(state.stream, { type: "end" }) };
    case "tool_execution_start":
      return {
        ...state,
        runningTools: [
          ...state.runningTools.filter((tool) => tool.toolCallId !== event.toolCallId),
          { toolCallId: event.toolCallId, toolName: event.toolName },
        ],
      };
    case "tool_execution_end":
      return {
        ...state,
        runningTools: state.runningTools.filter(
          (tool) => tool.toolCallId !== event.toolCallId,
        ),
      };
    case "agent_end":
      return {
        running: false,
        stream: streamReducer(state.stream, { type: "end" }),
        runningTools: [],
      };
    default:
      return state;
  }
}

export function shouldRecoverRuntime(input?: {
  running?: boolean;
  state?: { isStreaming?: boolean };
}) {
  return Boolean(input?.running && input.state?.isStreaming);
}

export function createUserContent(text: string, images: Array<{
  data: string;
  mimeType: string;
}>) {
  if (!images.length) return text;
  return [
    ...(text ? [{ type: "text" as const, text }] : []),
    ...images.map((image) => ({
      type: "image" as const,
      source: {
        type: "base64" as const,
        mediaType: image.mimeType,
        data: image.data,
      },
    })),
  ];
}
