"use client";

import {
  type ClipboardEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { DEMO_REPLY } from "./chat-constants";
import type {
  AttachedImage,
  ChatMessage,
  SubmitMode,
} from "./chat-types";

export function useChatController(onSessionStart?: () => void) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [images, setImages] = useState<AttachedImage[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [running, setRunning] = useState(false);
  const [model, setModel] = useState("Claude Sonnet 4");
  const [thinking, setThinking] = useState("medium");
  const [toolPreset, setToolPreset] = useState("default");
  const [soundEnabled, setSoundEnabled] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamTimerRef = useRef<number | null>(null);
  const imagesRef = useRef<AttachedImage[]>([]);

  useEffect(() => {
    const soundSync = window.setTimeout(() => {
      setSoundEnabled(window.localStorage.getItem("pi-chat-sound") === "true");
    }, 0);

    return () => window.clearTimeout(soundSync);
  }, []);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => {
      if (streamTimerRef.current !== null) {
        window.clearInterval(streamTimerRef.current);
      }
      imagesRef.current.forEach((image) =>
        URL.revokeObjectURL(image.previewUrl),
      );
    };
  }, []);

  function resizeTextarea() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }

  function scrollToLatest(behavior: ScrollBehavior = "smooth") {
    window.requestAnimationFrame(() => {
      scrollerRef.current?.scrollTo({
        top: scrollerRef.current.scrollHeight,
        behavior,
      });
    });
  }

  function addFiles(files: File[]) {
    const nextImages = files
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      }));

    if (nextImages.length) {
      setImages((current) => [...current, ...nextImages]);
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

  function finishStream(text: string) {
    if (streamTimerRef.current !== null) {
      window.clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: [
          {
            type: "thinking",
            thinking:
              "Reviewed the request and prepared a response using the current chat configuration.",
            duration: "1s",
          },
          { type: "text", text },
        ],
        timestamp: Date.now(),
      },
    ]);
    setStreamingText("");
    setRunning(false);
    scrollToLatest();
  }

  function startDemoStream() {
    setRunning(true);
    setStreamingText("");
    let cursor = 0;

    streamTimerRef.current = window.setInterval(() => {
      cursor += 3;
      const next = DEMO_REPLY.slice(0, cursor);
      setStreamingText(next);
      if (cursor >= DEMO_REPLY.length) finishStream(DEMO_REPLY);
    }, 24);
  }

  function submit(mode: SubmitMode = "prompt") {
    const content = draft.trim();
    if (!content && images.length === 0) return;

    const attachmentNote =
      images.length > 0
        ? `${content ? "\n" : ""}[${images.length} image${
            images.length === 1 ? "" : "s"
          } attached]`
        : "";

    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: `${mode === "prompt" ? "" : `[${mode}] `}${content}${attachmentNote}`,
        timestamp: Date.now(),
      },
    ]);
    if (mode === "prompt") onSessionStart?.();
    clearComposer();
    scrollToLatest();

    if (mode === "prompt" && !running) startDemoStream();
  }

  function stop() {
    if (streamTimerRef.current !== null) {
      window.clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    if (streamingText) finishStream(`${streamingText}\n\n*Stopped by user.*`);
    else setRunning(false);
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
    submit(running ? "steer" : "prompt");
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const pastedImages = Array.from(event.clipboardData.files).filter((file) =>
      file.type.startsWith("image/"),
    );
    if (pastedImages.length) addFiles(pastedImages);
  }

  function toggleSound() {
    setSoundEnabled((enabled) => {
      const nextEnabled = !enabled;
      window.localStorage.setItem("pi-chat-sound", String(nextEnabled));
      return nextEnabled;
    });
  }

  return {
    messages,
    draft,
    images,
    streamingText,
    running,
    model,
    thinking,
    toolPreset,
    soundEnabled,
    canSubmit: draft.trim().length > 0 || images.length > 0,
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
  };
}
