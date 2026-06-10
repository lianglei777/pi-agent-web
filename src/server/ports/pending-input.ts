export interface PendingInputProvider {
  create(
    provider: string,
    signal?: AbortSignal,
  ): { token: string; promise: Promise<string> };
  resolve(token: string, provider: string, value: string): void;
  rejectProvider(provider: string, reason: Error): void;
}
