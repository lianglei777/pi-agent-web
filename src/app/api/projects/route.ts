import { container } from "@/server/composition/container";
import { AppError } from "@/server/domain/app-error";
import {
  handleRoute,
  readJson,
} from "@/server/transport/http/api-response";
import { parseProjectPath } from "@/server/transport/http/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return handleRoute(() => container.projectService.list());
}

export function POST(request: Request) {
  return handleRoute(async () => {
    const { path } = parseProjectPath(await readJson(request));
    return container.projectService.add(path);
  });
}

export function DELETE(request: Request) {
  return handleRoute(() => {
    const value = new URL(request.url).searchParams.get("path")?.trim();
    if (!value) {
      throw new AppError("VALIDATION_ERROR", "path is required", 400);
    }
    return container.projectService.remove(value);
  });
}
