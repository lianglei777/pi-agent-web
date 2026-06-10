export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "SESSION_NOT_FOUND"
  | "FILE_NOT_FOUND"
  | "NOT_A_FILE"
  | "NOT_A_DIRECTORY"
  | "FILE_TOO_LARGE"
  | "MODEL_NOT_FOUND"
  | "UNSUPPORTED_COMMAND"
  | "COMPACTION_NOT_AVAILABLE"
  | "OAUTH_PROVIDER_NOT_FOUND"
  | "PENDING_INPUT_NOT_FOUND"
  | "SKILL_INSTALL_FAILED"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

