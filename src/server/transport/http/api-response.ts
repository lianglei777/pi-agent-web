import { AppError } from "@/server/domain/app-error";
import type { ApiResult } from "@/server/transport/http/api-result";

export function json<T>(data: T, init?: ResponseInit): Response {
  return Response.json(data, init);
}

export async function handleRoute<T>(work: () => Promise<T>): Promise<Response> {
  try {
    return json(await work());
  } catch (error) {
    return errorResponse(error);
  }
}

export function errorResponse(error: unknown): Response {
  const appError =
    error instanceof AppError
      ? error
      : new AppError(
          "INTERNAL_ERROR",
          error instanceof Error ? error.message : "Internal server error",
          500,
        );
  const body: ApiResult<never> = {
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      details: appError.details,
    },
  };
  return json(body, { status: appError.status });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError("VALIDATION_ERROR", "Invalid JSON body", 400);
  }
}

