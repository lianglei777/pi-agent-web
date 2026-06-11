"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { minimapSeek, minimapViewport } from "./minimap-logic";

type Point = { top: number; role: "user" | "assistant"; preview: string };

export function ChatMinimap({
  scroller,
  content,
  messageCount,
}: {
  scroller: HTMLDivElement | null;
  content: HTMLDivElement | null;
  messageCount: number;
}) {
  const [points, setPoints] = useState<Point[]>([]);
  const [metrics, setMetrics] = useState({
    visible: false,
    viewportTop: 0,
    viewportHeight: 0,
  });
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const measure = useCallback(() => {
    if (!scroller || !content) return;
    const total = scroller.scrollHeight;
    const height = scroller.clientHeight;
    const viewport = minimapViewport(scroller.scrollTop, total, height);
    setMetrics({
      visible: viewport.visible,
      viewportTop: viewport.top,
      viewportHeight: viewport.height,
    });
    const contentTop = content.getBoundingClientRect().top + scroller.scrollTop;
    setPoints(
      Array.from(
        content.querySelectorAll<HTMLElement>("[data-message-role]"),
      ).map((node) => ({
        top: Math.max(
          0,
          (node.getBoundingClientRect().top + scroller.scrollTop - contentTop) /
            total,
        ),
        role: node.dataset.messageRole as "user" | "assistant",
        preview: (node.textContent ?? "").trim().slice(0, 200),
      })),
    );
  }, [content, scroller]);

  useEffect(() => {
    if (!scroller || !content) return;
    const timer = window.setTimeout(measure, 50);
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    observer.observe(content);
    scroller.addEventListener("scroll", measure, { passive: true });
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      scroller.removeEventListener("scroll", measure);
    };
  }, [content, measure, messageCount, scroller]);

  const seekAt = useCallback((clientY: number) => {
    const track = trackRef.current;
    if (!track || !scroller) return;
    const rect = track.getBoundingClientRect();
    scroller!.scrollTo({
      top: minimapSeek(
        clientY,
        rect.top,
        rect.height,
        scroller!.scrollHeight,
      ),
    });
  }, [scroller]);

  useEffect(() => {
    if (!dragging) return;
    const move = (event: MouseEvent) => seekAt(event.clientY);
    const up = () => setDragging(false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up, { once: true });
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [dragging, seekAt]);

  if (!metrics.visible || !scroller) return null;

  return (
    <div
      aria-label="Conversation minimap"
      className="absolute top-0 right-0 bottom-0 z-10 w-9 cursor-pointer border-l border-line bg-panel/80"
      onMouseDown={(event) => {
        event.preventDefault();
        seekAt(event.clientY);
        setDragging(true);
      }}
      ref={trackRef}
      role="presentation"
    >
      <div
        className="absolute right-1 left-1 rounded border border-accent/35 bg-accent/8"
        style={{
          top: `${metrics.viewportTop * 100}%`,
          height: `${Math.max(5, metrics.viewportHeight * 100)}%`,
        }}
      />
      {points.map((point, index) => (
        <span
          className={`absolute left-1/2 -translate-x-1/2 ${
            point.role === "user"
              ? "size-2 rounded-sm bg-blue-500"
              : "size-1.5 rounded-full bg-muted"
          }`}
          key={`${point.top}-${index}`}
          style={{ top: `${point.top * 100}%` }}
          title={point.preview}
        />
      ))}
    </div>
  );
}
