import { container } from "@/server/composition/container";
import { handleRoute } from "@/server/transport/http/api-response";

export const runtime = "nodejs";

export async function GET() {
  return handleRoute(async () => ({
    models: await container.modelService.listAvailable(),
    defaultModel: await container.modelService.getDefault(),
  }));
}

