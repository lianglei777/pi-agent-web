import { container } from "@/server/composition/container";
import {
  handleRoute,
  readJson,
} from "@/server/transport/http/api-response";
import { parseSkillInstall } from "@/server/transport/http/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleRoute(async () =>
    container.skillService.install(
      parseSkillInstall(await readJson(request)),
    ),
  );
}
