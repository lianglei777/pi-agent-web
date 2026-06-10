import { container } from "@/server/composition/container";
import type { OAuthServerEvent } from "@/server/domain/auth";
import {
  handleRoute,
  readJson,
} from "@/server/transport/http/api-response";
import {
  asObject,
  requiredString,
} from "@/server/transport/http/validators";
import { createSseResponse } from "@/server/transport/sse/sse-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ provider: string }> };

export async function GET(request: Request, context: Context) {
  const { provider } = await context.params;
  return createSseResponse<OAuthServerEvent>({
    request,
    eventName: "oauth",
    subscribe: async (emit, signal) => {
      void container.authService
        .startOAuth(provider, emit, signal)
        .catch((error) => {
          emit({
            type: "error",
            message:
              error instanceof Error ? error.message : String(error),
          });
        });
      return () => {};
    },
  });
}

export async function POST(request: Request, context: Context) {
  return handleRoute(async () => {
    const { provider } = await context.params;
    const body = asObject(await readJson(request));
    container.authService.submitInput(
      provider,
      requiredString(body, "token"),
      requiredString(body, "value"),
    );
    return { success: true };
  });
}
