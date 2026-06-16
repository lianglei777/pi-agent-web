"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  computeMessageTopRatio,
  computeTooltipPositions,
  computeViewportGeometry,
  dragOffsetForPointer,
  findNearestNode,
  isElementVerticallyVisible,
  pointerRatioFromClientY,
  scrollTopForViewportRatio,
  selectTooltipWindow,
  TOOLTIP_HEIGHT,
  type MinimapMessageEntry,
  type MinimapNodeInfo,
  type ViewportInsets,
} from "./minimap-logic";

type Metrics = {
  visible: boolean;
  scrollRatio: number;
  viewportRatio: number;
  viewportTopRatio: number;
};

const INITIAL_METRICS: Metrics = {
  visible: false,
  scrollRatio: 0,
  viewportRatio: 1,
  viewportTopRatio: 0,
};
const MAX_HOVER_TOOLTIPS = 80;

export function ChatMinimap({
  scroller,
  content,
  messages,
  messageElementsRef,
  onHoverMessageChange,
  viewportInsets,
}: {
  scroller: HTMLDivElement | null;
  content: HTMLDivElement | null;
  messages: MinimapMessageEntry[];
  messageElementsRef: React.RefObject<Map<string, HTMLElement>>;
  onHoverMessageChange?: (messageId: string | null) => void;
  viewportInsets?: ViewportInsets;
}) {
  const [nodes, setNodes] = useState<MinimapNodeInfo[]>([]);
  const [metrics, setMetrics] = useState<Metrics>(INITIAL_METRICS);
  const [hovered, setHovered] = useState(false);
  const [mouseYRatio, setMouseYRatio] = useState<number | null>(null);
  const [minimapHeight, setMinimapHeight] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const dragOffsetRef = useRef(0);
  const measureFrameRef = useRef<number | null>(null);
  const viewportFrameRef = useRef<number | null>(null);
  const hoverMessageRef = useRef<string | null>(null);

  useEffect(() => {
    scrollerRef.current = scroller;
  }, [scroller]);

  const setHoverMessage = useCallback(
    (messageId: string | null) => {
      if (hoverMessageRef.current === messageId) return;
      hoverMessageRef.current = messageId;
      onHoverMessageChange?.(messageId);
    },
    [onHoverMessageChange],
  );

  const updateViewport = useCallback(() => {
    if (!scroller) {
      setMetrics(INITIAL_METRICS);
      return;
    }

    const viewport = computeViewportGeometry({
      clientHeight: scroller.clientHeight,
      scrollHeight: scroller.scrollHeight,
      scrollTop: scroller.scrollTop,
      viewportInsets,
    });
    setMetrics(viewport);
    setMinimapHeight(trackRef.current?.clientHeight ?? scroller.clientHeight);
  }, [scroller, viewportInsets]);

  const measure = useCallback(() => {
    if (!scroller) {
      setMetrics(INITIAL_METRICS);
      setNodes([]);
      return;
    }

    updateViewport();

    const containerRect = scroller.getBoundingClientRect();
    const nextNodes = messages.flatMap((message, index) => {
      if (!message.showNode) return [];
      const element = messageElementsRef.current?.get(message.id);
      if (!element || scroller.scrollHeight <= 0) return [];

      const elementRect = element.getBoundingClientRect();
      return [
        {
          id: message.id,
          role: message.role,
          preview: message.preview,
          topRatio: computeMessageTopRatio({
            containerTop: containerRect.top,
            elementTop: elementRect.top,
            scrollHeight: scroller.scrollHeight,
            scrollTop: scroller.scrollTop,
          }),
          heightRatio: elementRect.height / scroller.scrollHeight,
          index,
        },
      ];
    });

    setNodes(nextNodes);
  }, [messageElementsRef, messages, scroller, updateViewport]);

  const scheduleMeasure = useCallback(() => {
    if (measureFrameRef.current !== null) return;
    measureFrameRef.current = window.requestAnimationFrame(() => {
      measureFrameRef.current = null;
      measure();
    });
  }, [measure]);

  const scheduleViewportUpdate = useCallback(() => {
    if (viewportFrameRef.current !== null) return;
    viewportFrameRef.current = window.requestAnimationFrame(() => {
      viewportFrameRef.current = null;
      updateViewport();
    });
  }, [updateViewport]);

  useEffect(() => {
    if (!scroller) return;

    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(scroller);
    if (content) observer.observe(content);

    scroller.addEventListener("scroll", scheduleViewportUpdate, {
      passive: true,
    });
    scheduleMeasure();

    return () => {
      observer.disconnect();
      scroller.removeEventListener("scroll", scheduleViewportUpdate);
      if (measureFrameRef.current !== null) {
        window.cancelAnimationFrame(measureFrameRef.current);
        measureFrameRef.current = null;
      }
      if (viewportFrameRef.current !== null) {
        window.cancelAnimationFrame(viewportFrameRef.current);
        viewportFrameRef.current = null;
      }
    };
  }, [content, scheduleMeasure, scheduleViewportUpdate, scroller]);

  useEffect(() => {
    const timer = window.setTimeout(scheduleMeasure, 50);
    return () => window.clearTimeout(timer);
  }, [messages.length, scheduleMeasure]);

  useEffect(() => {
    return () => {
      draggingRef.current = false;
      onHoverMessageChange?.(null);
    };
  }, [onHoverMessageChange]);

  const scrollToViewportTopRatio = useCallback(
    (viewportTopRatio: number) => {
      const element = scrollerRef.current;
      if (!element) return;
      element.scrollTop = scrollTopForViewportRatio({
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
        viewportInsets,
        viewportTopRatio,
      });
      scheduleViewportUpdate();
    },
    [scheduleViewportUpdate, viewportInsets],
  );

  const nearestIndex = useMemo(
    () => findNearestNode(nodes, mouseYRatio),
    [mouseYRatio, nodes],
  );
  const tooltipEntries = useMemo(() => {
    const previewNodes = nodes
      .map((node, index) => ({ index, node }))
      .filter(({ node }) => node.preview);
    const nearestPreviewIndex =
      nearestIndex === null
        ? null
        : previewNodes.findIndex(({ index }) => index === nearestIndex);
    const tooltipNearestIndex =
      nearestPreviewIndex !== null && nearestPreviewIndex >= 0
        ? nearestPreviewIndex
        : null;

    return selectTooltipWindow(
      previewNodes,
      tooltipNearestIndex,
      MAX_HOVER_TOOLTIPS,
    ).map(({ item }) => item);
  }, [nearestIndex, nodes]);
  const tooltipWindowPositions = useMemo(
    () =>
      computeTooltipPositions(
        tooltipEntries.map(({ node }) => node),
        minimapHeight || 600,
      ),
    [minimapHeight, tooltipEntries],
  );

  if (!metrics.visible || !scroller) return null;

  return (
    <div
      aria-label="Conversation minimap"
      className="relative w-9 flex-shrink-0 touch-none select-none overflow-visible border-l border-line bg-panel"
      onPointerCancel={(event) => {
        draggingRef.current = false;
        setHoverMessage(null);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        const pointerRatio = pointerRatioFromClientY({
          clientY: event.clientY,
          trackHeight: rect.height,
          trackTop: rect.top,
        });
        const offset = dragOffsetForPointer({
          pointerRatio,
          viewportTopRatio: metrics.viewportTopRatio,
          viewportRatio: metrics.viewportRatio,
        });
        dragOffsetRef.current = offset;
        draggingRef.current = true;
        setHoverMessage(null);
        event.currentTarget.setPointerCapture(event.pointerId);
        scrollToViewportTopRatio(pointerRatio - offset);
      }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => {
        if (draggingRef.current) return;
        setHovered(false);
        setMouseYRatio(null);
        setHoverMessage(null);
      }}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const pointerRatio = pointerRatioFromClientY({
          clientY: event.clientY,
          trackHeight: rect.height,
          trackTop: rect.top,
        });
        setMouseYRatio(pointerRatio);
        if (draggingRef.current) {
          scrollToViewportTopRatio(pointerRatio - dragOffsetRef.current);
          return;
        }

        const nearestNodeIndex = findNearestNode(nodes, pointerRatio);
        const node =
          nearestNodeIndex === null ? null : nodes[nearestNodeIndex] ?? null;
        const element = node
          ? messageElementsRef.current?.get(node.id) ?? null
          : null;
        const scrollElement = scrollerRef.current;

        if (!node || !element || !scrollElement) {
          setHoverMessage(null);
          return;
        }

        const scrollRect = scrollElement.getBoundingClientRect();
        const visibleViewport = {
          bottom: scrollRect.bottom - (viewportInsets?.bottom ?? 0),
          top: scrollRect.top + (viewportInsets?.top ?? 0),
        };
        const isVisible = isElementVerticallyVisible(
          element.getBoundingClientRect(),
          visibleViewport,
        );
        setHoverMessage(isVisible ? node.id : null);
      }}
      onPointerUp={(event) => {
        draggingRef.current = false;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      ref={trackRef}
      role="presentation"
    >
      {/* Minimap center line */}
      <div className="absolute top-0 bottom-0 left-1/2 z-0 w-px -translate-x-1/2 bg-line" />

      {/* scroll bar */}
      <div
        className="pointer-events-none absolute right-0 left-0 z-10 border-y border-neutral-500/20 bg-neutral-500/10"
        style={{
          height: `${metrics.viewportRatio * 100}%`,
          top: `${metrics.viewportTopRatio * 100}%`,
        }}
      />
      
      {/* chat node */}
      {nodes.map((node, index) => {
        const nearest = index === nearestIndex;
        return (
          <span
            className="absolute right-0 left-0 z-20 flex h-3 -translate-y-1/2 cursor-pointer items-center justify-center"
            key={node.id}
            style={{ top: `${node.topRatio * 100}%` }}
          >
            <span
              className={
                node.role === "user"
                  ? "size-2 flex-shrink-0 rounded-[2px] border-[1.5px] border-accent/70 bg-accent/20 transition-transform"
                  : "size-1.5 flex-shrink-0 rounded-full border-[1.5px] border-dim/50 bg-dim/15 transition-transform"
              }
              style={{ transform: nearest ? "scale(1.6)" : "scale(1)" }}
            />
          </span>
        );
      })}

      {/* Preview shown when hovering a minimap node */}
      {hovered
        ? tooltipEntries.map(({ node, index }, tooltipIndex) => {
            const nearest = index === nearestIndex;
            const roleBorder =
              node.role === "user"
                ? "rgba(23, 23, 23, 0.7)"
                : "rgba(157, 157, 151, 0.5)";

            return (
              <div
                className="pointer-events-none absolute right-full z-[100] mr-1.5 w-[200px] rounded border-y border-r bg-panel px-[7px] text-[11px] leading-[18px] transition-[top,opacity]"
                key={`${node.id}-tooltip`}
                style={{
                  borderLeftColor: roleBorder,
                  borderLeftStyle: "solid",
                  borderLeftWidth: 2,
                  borderBottomColor: nearest ? roleBorder : "var(--border)",
                  borderRightColor: nearest ? roleBorder : "var(--border)",
                  borderTopColor: nearest ? roleBorder : "var(--border)",
                  height: TOOLTIP_HEIGHT,
                  opacity: nearest ? 1 : 0.45,
                  top: tooltipWindowPositions[tooltipIndex] ?? 0,
                }}
              >
                <div
                  className={`truncate ${nearest ? "text-primary" : "text-muted"}`}
                >
                  {node.preview}
                </div>
              </div>
            );
          })
        : null}
    </div>
  );
}
