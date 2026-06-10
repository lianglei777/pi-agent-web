import { randomUUID } from "node:crypto";
import { AppError } from "@/server/domain/app-error";
import type { PendingInputProvider } from "@/server/ports/pending-input";

type PendingInput = {
  provider: string;
  resolve: (value: string) => void;
  reject: (reason: Error) => void;
};

export class PendingInputRegistry implements PendingInputProvider {
  private readonly pending = new Map<string, PendingInput>();

  create(
    provider: string,
    signal?: AbortSignal,
  ): { token: string; promise: Promise<string> } {
    const token = randomUUID();
    const promise = new Promise<string>((resolve, reject) => {
      const entry: PendingInput = {
        provider,
        resolve: (value) => {
          this.pending.delete(token);
          resolve(value);
        },
        reject: (reason) => {
          this.pending.delete(token);
          reject(reason);
        },
      };
      this.pending.set(token, entry);
      signal?.addEventListener(
        "abort",
        () => entry.reject(new Error("OAuth input was aborted")),
        { once: true },
      );
    });
    return { token, promise };
  }

  resolve(token: string, provider: string, value: string): void {
    const entry = this.pending.get(token);
    if (!entry) {
      throw new AppError(
        "PENDING_INPUT_NOT_FOUND",
        "Pending OAuth input was not found",
        404,
      );
    }
    if (entry.provider !== provider) {
      throw new AppError(
        "PENDING_INPUT_NOT_FOUND",
        "Pending OAuth input does not belong to this provider",
        404,
      );
    }
    entry.resolve(value);
  }

  rejectProvider(provider: string, reason: Error): void {
    for (const entry of this.pending.values()) {
      if (entry.provider === provider) entry.reject(reason);
    }
  }

  has(token: string): boolean {
    return this.pending.has(token);
  }
}
