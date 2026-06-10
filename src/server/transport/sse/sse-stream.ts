type SseOptions<T> = {
  request: Request;
  eventName?: string;
  initial?: T;
  subscribe: (
    emit: (event: T) => void,
    signal: AbortSignal,
  ) => Promise<() => void> | (() => void);
  heartbeatMs?: number;
};

const encoder = new TextEncoder();

export function createSseResponse<T>(options: SseOptions<T>): Response {
  const controller = new AbortController();
  let cleanup: (() => void) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(streamController) {
      const emit = (event: T) => {
        if (closed) return;
        streamController.enqueue(
          encoder.encode(
            `${options.eventName ? `event: ${options.eventName}\n` : ""}data: ${JSON.stringify(event)}\n\n`,
          ),
        );
      };
      const close = () => {
        if (closed) return;
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        cleanup?.();
        controller.abort();
        try {
          streamController.close();
        } catch {}
      };

      options.request.signal.addEventListener("abort", close, { once: true });
      if (options.initial !== undefined) emit(options.initial);
      heartbeat = setInterval(() => {
        if (!closed) streamController.enqueue(encoder.encode(":\n\n"));
      }, options.heartbeatMs ?? 25_000);
      heartbeat.unref?.();

      try {
        cleanup = await options.subscribe(emit, controller.signal);
        if (closed) cleanup();
      } catch (error) {
        if (!closed) {
          emit({
            type: "error",
            message: error instanceof Error ? error.message : String(error),
          } as T);
          close();
        }
      }
    },
    cancel() {
      if (closed) return;
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
      cleanup?.();
      controller.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}

