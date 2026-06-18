import { container } from "@/server/composition/container";
import {
  handleRoute,
  readJson,
} from "@/server/transport/http/api-response";
import { parseModelDiscovery } from "@/server/transport/http/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleRoute(async () =>
    container.modelService.discoverModels(
      parseModelDiscovery(await readJson(request)),
    ),
  );
}
