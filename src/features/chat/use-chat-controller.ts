"use client";

import {
  type ClipboardEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  createAgent,
  loadModels,
  loadRuntime,
  loadSession,
  loadSessionContext,
  sendCommand,
} from "./agent-api";
import {
  resolveLoadedModelState,
  resolveSubmitTarget,
  type SubmitMode,
} from "./chat-controller-state";
import {
  phaseLabel,
  presetFromTools,
  createUserContent,
  sessionStats,
  streamReducer,
  TOOL_PRESETS,
} from "./chat-logic";
import { useI18n } from "@/i18n/use-i18n";
import type {
  AgentEvent,
  AgentMessage,
  AttachedImage,
  ContextUsage,
  ImageInput,
  ModelInfo,
  SessionStats,
  SessionTreeNode,
  ThinkingLevel,
  UserMessage,
} from "./agent-types";

export type ChatSession = { id: string; cwd: string };

export type ChatControllerOptions = {
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
};

export function useChatController(options: ChatControllerOptions) {
  const {
    session,
    newSessionCwd,
    onAgentEnd,
    onSessionCreated,
    onSessionForked,
    onBranchDataChange,
    onSystemPromptChange,
    onSessionStatsChange,
    onContextUsageChange,
  } = options;
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [entryIds, setEntryIds] = useState<string[]>([]);
  const [tree, setTree] = useState<SessionTreeNode[]>([]);
  const [activeLeafId, setActiveLeafId] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(session));
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [draft, setDraft] = useState("");
  const [images, setImages] = useState<AttachedImage[]>([]);
  const [running, setRunning] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [runningTools, setRunningTools] = useState<
    Array<{ toolCallId: string; toolName: string }>
  >([]);
  const [retryInfo, setRetryInfo] = useState<{
    attempt: number;
    maxAttempts: number;
    errorMessage?: string;
  } | null>(null);
  const [isCompacting, setIsCompacting] = useState(false);
  const [compactError, setCompactError] = useState("");
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelKey, setModelKey] = useState("");
  const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>("auto");
  const [toolPreset, setToolPreset] =
    useState<keyof typeof TOOL_PRESETS>("default");
  const [forkingEntryId, setForkingEntryId] = useState<string | null>(null);
  const [stream, dispatchStream] = useReducer(streamReducer, {
    isStreaming: false,
    streamingMessage: null,
  });
  const { t } = useI18n();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sourceRef = useRef<EventSource | null>(null);
  const reconnectRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const connectSseRef = useRef<(id: string) => void>(() => {});
  const runningRef = useRef(false);
  const sessionIdRef = useRef(session?.id ?? null);
  const imagesRef = useRef<AttachedImage[]>([]);
  const firstHistoryRef = useRef(true);
  const lastUserRef = useRef<HTMLElement | null>(null);

  const isNew = !session && Boolean(newSessionCwd);
  const currentModel = useMemo(
    () => models.find((model) => `${model.provider}:${model.id}` === modelKey),
    [modelKey, models],
  );
  const stats = useMemo(() => sessionStats(messages), [messages]);
  const agentPhase = phaseLabel(runningTools, running);

  const syncRuntimeState = useCallback(
    (state?: {
      isStreaming?: boolean;
      isCompacting?: boolean;
      contextUsage?: ContextUsage | null;
      systemPrompt?: string;
      thinkingLevel?: ThinkingLevel;
      model?: { provider: string; id: string };
    }) => {
      if (!state) return;
      setIsCompacting(Boolean(state.isCompacting));
      onContextUsageChange?.(state.contextUsage ?? null);
      onSystemPromptChange?.(state.systemPrompt ?? null);
      if (state.thinkingLevel) setThinkingLevel(state.thinkingLevel);
      if (state.model) setModelKey(`${state.model.provider}:${state.model.id}`);
    },
    [onContextUsageChange, onSystemPromptChange],
  );

  const applyDetail = useCallback(
    (detail: Awaited<ReturnType<typeof loadSession>>) => {
      setMessages(detail.context.messages);
      setEntryIds(detail.context.entryIds);
      setTree(detail.tree);
      setActiveLeafId(detail.leafId);
      setThinkingLevel(detail.context.thinkingLevel);
      if (detail.context.model) {
        setModelKey(
          `${detail.context.model.provider}:${detail.context.model.modelId}`,
        );
      }
      syncRuntimeState(detail.agentState?.state);
    },
    [syncRuntimeState],
  );

  const reloadHistory = useCallback(async () => {
    const id = sessionIdRef.current;
    if (!id) return;
    const detail = await loadSession(id);
    applyDetail(detail);
  }, [applyDetail]);

  const closeSource = useCallback(() => {
    sourceRef.current?.close();
    sourceRef.current = null;
    if (reconnectRef.current !== null) {
      window.clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    }
  }, []);

  const handleAgentEnd = useCallback(async () => {
    setRunning(false);
    runningRef.current = false;
    setStopping(false);
    setRunningTools([]);
    setRetryInfo(null);
    dispatchStream({ type: "end" });
    closeSource();
    try {
      await reloadHistory();
      const id = sessionIdRef.current;
      if (id) {
        const snapshot = await loadRuntime(id);
        syncRuntimeState(snapshot.state);
      }
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "Unable to refresh history",
      );
    }
    onAgentEnd?.();
  }, [
    closeSource,
    onAgentEnd,
    reloadHistory,
    syncRuntimeState,
  ]);

  const handleEvent = useCallback(
    (event: AgentEvent) => {
      switch (event.type) {
        case "connected":
          if (event.sessionId !== sessionIdRef.current) closeSource();
          break;
        case "agent_start":
          setRunning(true);
          runningRef.current = true;
          dispatchStream({ type: "start" });
          break;
        case "message_start":
        case "message_update":
          dispatchStream({ type: "update", message: event.message });
          break;
        case "message_end":
          if (event.message.role !== "user") {
            setMessages((current) => [...current, event.message]);
          }
          dispatchStream({ type: "end" });
          break;
        case "tool_execution_start":
          setRunningTools((current) => [
            ...current.filter((tool) => tool.toolCallId !== event.toolCallId),
            { toolCallId: event.toolCallId, toolName: event.toolName },
          ]);
          break;
        case "tool_execution_end":
          setRunningTools((current) =>
            current.filter((tool) => tool.toolCallId !== event.toolCallId),
          );
          break;
        case "retry_start":
        case "auto_retry_start":
          setRetryInfo(event);
          break;
        case "retry_end":
        case "auto_retry_end":
          setRetryInfo(null);
          break;
        case "compaction_start":
        case "auto_compaction_start":
          setIsCompacting(true);
          setCompactError("");
          break;
        case "compaction_end":
        case "auto_compaction_end":
          setIsCompacting(false);
          if (event.errorMessage) setCompactError(event.errorMessage);
          else if (!event.aborted) void reloadHistory();
          break;
        case "agent_end":
          void handleAgentEnd();
          break;
      }
    },
    [closeSource, handleAgentEnd, reloadHistory],
  );

  const connectSse = useCallback(
    (id: string) => {
      closeSource();
      const source = new EventSource(
        `/api/agent/${encodeURIComponent(id)}/events`,
      );
      sourceRef.current = source;
      source.addEventListener("agent", (message) => {
        try {
          handleEvent(JSON.parse((message as MessageEvent).data) as AgentEvent);
        } catch {
          // Ignore a malformed event and keep the stream alive.
        }
      });
      source.onopen = () => {
        reconnectAttemptRef.current = 0;
      };
      source.onerror = () => {
        source.close();
        if (!runningRef.current) return;
        const delay = Math.min(1000 * 2 ** reconnectAttemptRef.current, 10_000);
        reconnectAttemptRef.current += 1;
        reconnectRef.current = window.setTimeout(
          () => connectSseRef.current(id),
          delay,
        );
      };
    },
    [closeSource, handleEvent],
  );
  useEffect(() => {
    connectSseRef.current = connectSse;
  }, [connectSse]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const modelData = await loadModels();
        setModels(modelData.models);
        setModelKey(
          (current) => resolveLoadedModelState(current, modelData).modelKey,
        );
      } catch (cause) {
        setActionError(
          cause instanceof Error ? cause.message : "Unable to load models",
        );
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(async () => {
      sessionIdRef.current = session.id;
      setLoading(true);
      try {
        const detail = await loadSession(session.id);
        applyDetail(detail);
        setError("");
        if (detail.agentState?.running && detail.agentState.state?.isStreaming) {
          setRunning(true);
          runningRef.current = true;
          dispatchStream({ type: "start" });
          connectSse(session.id);
          try {
            const tools = await sendCommand<{ active: string[] }>(session.id, {
              type: "get_tools",
            });
            setToolPreset(presetFromTools(tools.active));
          } catch {
            // Tool state does not block session recovery.
          }
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to load session");
      } finally {
        setLoading(false);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [applyDetail, connectSse, session]);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    onSessionStatsChange?.(stats);
  }, [onSessionStatsChange, stats]);

  const changeLeaf = useCallback(
    async (leafId: string) => {
      const id = sessionIdRef.current;
      if (!id || running) return;
      const previous = activeLeafId;
      setActiveLeafId(leafId);
      try {
        const result = await loadSessionContext(id, leafId);
        await sendCommand(id, { type: "navigate_tree", targetId: leafId });
        setMessages(result.context.messages);
        setEntryIds(result.context.entryIds);
      } catch (cause) {
        setActiveLeafId(previous);
        setActionError(
          cause instanceof Error ? cause.message : "Unable to change branch",
        );
      }
    },
    [activeLeafId, running],
  );

  useEffect(() => {
    onBranchDataChange?.(tree, activeLeafId, changeLeaf);
  }, [activeLeafId, changeLeaf, onBranchDataChange, tree]);

  useEffect(() => {
    return () => {
      closeSource();
      imagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      onBranchDataChange?.([], null, async () => {});
      onSystemPromptChange?.(null);
      onSessionStatsChange?.(null);
      onContextUsageChange?.(null);
    };
  }, [
    closeSource,
    onBranchDataChange,
    onContextUsageChange,
    onSessionStatsChange,
    onSystemPromptChange,
  ]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || messages.length === 0) return;
    if (firstHistoryRef.current) {
      firstHistoryRef.current = false;
      scroller.scrollTop = scroller.scrollHeight;
      return;
    }
    if (!running) {
      scroller.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
    }
  }, [messages.length, running]);

  function resizeTextarea() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }

  useEffect(() => {
    function insertMention(event: Event) {
      const text = (event as CustomEvent<string>).detail;
      const textarea = textareaRef.current;
      setDraft((current) => {
        const start = textarea?.selectionStart ?? current.length;
        const end = textarea?.selectionEnd ?? current.length;
        const prefix = current.slice(0, start);
        const separator = prefix && !/\s$/.test(prefix) ? " " : "";
        return `${prefix}${separator}${text}${current.slice(end)}`;
      });
      window.requestAnimationFrame(() => {
        textareaRef.current?.focus();
        resizeTextarea();
      });
    }
    window.addEventListener("pi:mention-file", insertMention);
    return () => window.removeEventListener("pi:mention-file", insertMention);
  });

  function insertIfEmpty(text: string) {
    if (draft.trim()) return;
    setDraft(text);
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      resizeTextarea();
    });
  }

  async function addFiles(files: File[]) {
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    const settled = await Promise.allSettled(imageFiles.map(readImage));
    const next = settled
      .filter(
        (result): result is PromiseFulfilledResult<AttachedImage> =>
          result.status === "fulfilled",
      )
      .map((result) => result.value);
    if (next.length) setImages((current) => [...current, ...next]);
    if (settled.some((result) => result.status === "rejected")) {
      setActionError("One or more images could not be read");
    }
  }

  function removeImage(id: string) {
    setImages((current) => {
      const image = current.find((item) => item.id === id);
      if (image) URL.revokeObjectURL(image.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  }

  function clearComposer() {
    setDraft("");
    setImages((current) => {
      current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      return [];
    });
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  async function submit(mode: SubmitMode = "prompt") {
    const text = draft.trim();
    if (!text && images.length === 0) return;
    const target = resolveSubmitTarget({
      isNew,
      mode,
      newSessionCwd,
      sessionId: sessionIdRef.current,
    });
    if (target.type === "blocked") {
      setActionError(t.chat.input.selectProjectBeforeStart);
      return;
    }
    const imageInputs: ImageInput[] = images.map(({ data, mimeType }) => ({
      type: "image",
      data,
      mimeType,
    }));
    const userMessage: UserMessage = {
      role: "user",
      content: createUserContent(text, imageInputs),
      timestamp: Date.now(),
      clientId: crypto.randomUUID(),
      status: "pending",
    };
    if (mode === "steer" && typeof userMessage.content === "string") {
      userMessage.content = `[steer] ${userMessage.content}`;
    }
    setMessages((current) => [...current, userMessage]);
    clearComposer();
    setActionError("");

    try {
      if (target.type === "new") {
        setRunning(true);
        runningRef.current = true;
        dispatchStream({ type: "start" });
        const selected = currentModel;
        const created = await createAgent({
          cwd: target.cwd,
          message: text,
          images: imageInputs.length ? imageInputs : undefined,
          provider: selected?.provider,
          modelId: selected?.id,
          thinkingLevel:
            thinkingLevel === "auto" ? undefined : thinkingLevel,
          toolNames: [...TOOL_PRESETS[toolPreset]],
        });
        sessionIdRef.current = created.sessionId;
        connectSse(created.sessionId);
        onSessionCreated?.(created.sessionId);
      } else {
        if (mode === "prompt") {
          setRunning(true);
          runningRef.current = true;
          dispatchStream({ type: "start" });
          connectSse(target.sessionId);
        }
        await sendCommand(target.sessionId, {
          type: mode,
          message: text,
          images: imageInputs.length ? imageInputs : undefined,
        });
      }
      setMessages((current) =>
        current.map((message) =>
          message.role === "user" && message.clientId === userMessage.clientId
            ? { ...message, status: undefined }
            : message,
        ),
      );
      window.requestAnimationFrame(() =>
        lastUserRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }),
      );
    } catch (cause) {
      if (mode === "prompt") {
        setRunning(false);
        runningRef.current = false;
        dispatchStream({ type: "reset" });
      }
      setMessages((current) =>
        current.map((message) =>
          message.role === "user" && message.clientId === userMessage.clientId
            ? { ...message, status: "failed" }
            : message,
        ),
      );
      setActionError(cause instanceof Error ? cause.message : "Message failed");
    }
  }

  async function stop() {
    const id = sessionIdRef.current;
    if (!id || stopping) return;
    setStopping(true);
    try {
      await sendCommand(id, { type: "abort" });
    } catch (cause) {
      setStopping(false);
      setActionError(cause instanceof Error ? cause.message : "Stop failed");
    }
  }

  async function changeModel(value: string) {
    setModelKey(value);
    const [provider, modelId] = value.split(":");
    const id = sessionIdRef.current;
    if (!isNew && id && provider && modelId) {
      try {
        await sendCommand(id, { type: "set_model", provider, modelId });
      } catch (cause) {
        setActionError(cause instanceof Error ? cause.message : "Model change failed");
      }
    }
  }

  async function changeThinking(level: ThinkingLevel) {
    setThinkingLevel(level);
    const id = sessionIdRef.current;
    if (!isNew && id && level !== "auto") {
      try {
        await sendCommand(id, { type: "set_thinking_level", level });
      } catch (cause) {
        setActionError(cause instanceof Error ? cause.message : "Thinking change failed");
      }
    }
  }

  async function changeTools(preset: keyof typeof TOOL_PRESETS) {
    setToolPreset(preset);
    const id = sessionIdRef.current;
    if (!isNew && id) {
      try {
        await sendCommand(id, {
          type: "set_tools",
          toolNames: [...TOOL_PRESETS[preset]],
        });
      } catch (cause) {
        setActionError(cause instanceof Error ? cause.message : "Tool change failed");
      }
    }
  }

  async function compact() {
    const id = sessionIdRef.current;
    if (!id) return;
    setCompactError("");
    setIsCompacting(true);
    try {
      await sendCommand(id, {
        type: isCompacting ? "abort_compaction" : "compact",
      });
    } catch (cause) {
      setIsCompacting(false);
      setCompactError(cause instanceof Error ? cause.message : "Compact failed");
    }
  }

  async function fork(entryId: string) {
    const id = sessionIdRef.current;
    if (!id) return;
    setForkingEntryId(entryId);
    try {
      const result = await sendCommand<{ sessionId: string }>(id, {
        type: "fork",
        entryId,
      });
      onSessionForked?.(result.sessionId);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Fork failed");
    } finally {
      setForkingEntryId(null);
    }
  }

  async function editFromHere(
    targetId: string,
    text: string,
  ) {
    await changeLeaf(targetId);
    insertIfEmpty(text);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return;
    }
    event.preventDefault();
    void submit(running ? "steer" : "prompt");
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(event.clipboardData.files);
    if (files.some((file) => file.type.startsWith("image/"))) void addFiles(files);
  }

  return {
    messages,
    entryIds,
    stream,
    loading,
    error,
    actionError,
    setActionError,
    draft,
    setDraft,
    images,
    running,
    stopping,
    agentPhase,
    retryInfo,
    isCompacting,
    compactError,
    models,
    modelKey,
    currentModel,
    thinkingLevel,
    toolPreset,
    forkingEntryId,
    textareaRef,
    scrollerRef,
    contentRef,
    fileInputRef,
    lastUserRef,
    setScrollerNode(node: HTMLDivElement | null) {
      scrollerRef.current = node;
    },
    setContentNode(node: HTMLDivElement | null) {
      contentRef.current = node;
    },
    canSubmit: Boolean(draft.trim() || images.length),
    isNew,
    resizeTextarea,
    addFiles,
    removeImage,
    submit,
    stop,
    changeModel,
    changeThinking,
    changeTools,
    compact,
    fork,
    editFromHere,
    handleKeyDown,
    handlePaste,
  };
}

function readImage(file: File): Promise<AttachedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Image read failed"));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      if (comma < 0) {
        reject(new Error("Invalid image data"));
        return;
      }
      resolve({
        id: crypto.randomUUID(),
        name: file.name,
        data: result.slice(comma + 1),
        mimeType: file.type,
        previewUrl: URL.createObjectURL(file),
        type: "image",
      });
    };
    reader.readAsDataURL(file);
  });
}
