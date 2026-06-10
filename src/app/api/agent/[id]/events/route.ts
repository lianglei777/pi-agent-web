import { container } from "@/server/composition/container";
import { createSseResponse } from "@/server/transport/sse/sse-stream";
import type { AgentEvent } from "@/server/domain/agent-event";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return createSseResponse<AgentEvent>({
    request,
    eventName: "agent",
    initial: { type: "connected", sessionId: id },
    subscribe: (emit) => container.agentService.subscribe(id, emit),
  });
}

