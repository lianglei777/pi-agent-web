import { container } from "@/server/composition/container";
import {
  handleRoute,
  readJson,
} from "@/server/transport/http/api-response";
import {
  asObject,
  requiredBoolean,
  requiredString,
} from "@/server/transport/http/validators";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleRoute(() => {
    const cwd = new URL(request.url).searchParams.get("cwd") ?? process.cwd();
    return container.skillService.load(cwd);
  });
}

export async function PATCH(request: Request) {
  return handleRoute(async () => {
    const body = asObject(await readJson(request));
    await container.skillService.setModelInvocationDisabled(
      requiredString(body, "filePath"),
      requiredBoolean(body, "disabled"),
    );
    return { success: true };
  });
}

