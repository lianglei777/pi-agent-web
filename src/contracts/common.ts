export interface SuccessResponse {
  success: true;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface SseErrorEvent {
  type: "error";
  message: string;
}
