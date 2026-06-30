import { container } from "@/server/composition/container";
import { handleRoute } from "@/server/transport/http/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const value = new URL(request.url).searchParams.get("path")?.trim();
  return handleRoute(() => container.projectService.browse(value || undefined));
}
