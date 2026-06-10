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

type Context = { params: Promise<{ provider: string }> };

export async function GET(_request: Request, context: Context) {
  return handleRoute(async () => {
    const { provider } = await context.params;
    return container.authService.getApiKeyStatus(provider);
  });
}

export async function POST(request: Request, context: Context) {
  return handleRoute(async () => {
    const { provider } = await context.params;
    const body = asObject(await readJson(request));
    await container.authService.setApiKey(
      provider,
      requiredString(body, "apiKey"),
    );
    return { success: true };
  });
}

export async function DELETE(_request: Request, context: Context) {
  return handleRoute(async () => {
    const { provider } = await context.params;
    await container.authService.removeApiKey(provider);
    return { success: true };
  });
}

