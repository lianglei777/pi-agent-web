import { container } from "@/server/composition/container";
import {
  handleRoute,
  readJson,
} from "@/server/transport/http/api-response";
import { parseAgentCommand } from "@/server/transport/http/validators";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  return handleRoute(async () => {
    const { id } = await context.params;
    const snapshot = await container.agentService.getSnapshot(id);
    return { running: snapshot.loaded, state: snapshot.state };
  });
}

export async function POST(request: Request, context: Context) {
  return handleRoute(async () => {
    const { id } = await context.params;
    const result = await container.agentService.execute(
      id,
      parseAgentCommand(await readJson(request)),
    );
    return result === undefined ? { success: true } : result;
  });
}
