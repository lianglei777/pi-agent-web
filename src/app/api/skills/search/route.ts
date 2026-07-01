import type {
  SearchSkillsRequest,
  SearchSkillsResponse,
} from "@/contracts/skills";
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
  return handleRoute<SearchSkillsResponse>(async () => {
    const body = asObject(await readJson(request));
    const input: SearchSkillsRequest = {
      query: requiredString(body, "query"),
      limit: Math.min(
      50,
      typeof body.limit === "number" && body.limit > 0
        ? Math.floor(body.limit)
        : 20,
      ),
    };
    return {
      results: await container.skillService.search(
        input.query,
        input.limit,
      ),
    };
  });
}
