import { container } from "@/server/composition/container";
import {
  handleRoute,
  readJson,
} from "@/server/transport/http/api-response";
import {
  asObject,
  requiredString,
} from "@/server/transport/http/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleRoute(async () => {
    const body = asObject(await readJson(request));
    const limit =
      typeof body.limit === "number" && body.limit > 0 ? body.limit : 20;
    return container.skillService.search(requiredString(body, "query"), limit);
  });
}

