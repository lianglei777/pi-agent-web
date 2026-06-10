import type { OAuthServerEvent } from "@/server/domain/auth";
import type { CredentialProvider } from "@/server/ports/credential-provider";
import type { PendingInputProvider } from "@/server/ports/pending-input";

export class AuthService {
  constructor(
    private readonly credentials: CredentialProvider,
    private readonly pendingInputs: PendingInputProvider,
  ) {}

  listOAuthProviders() {
    return this.credentials.listOAuthProviders();
  }

  listApiKeyProviders() {
    return this.credentials.listApiKeyProviders();
  }

  getApiKeyStatus(provider: string) {
    return this.credentials.getApiKeyStatus(provider);
  }

  setApiKey(provider: string, apiKey: string) {
    return this.credentials.setApiKey(provider, apiKey);
  }

  removeApiKey(provider: string) {
    return this.credentials.removeApiKey(provider);
  }

  logout(provider: string) {
    return this.credentials.logout(provider);
  }

  submitInput(provider: string, token: string, value: string): void {
    this.pendingInputs.resolve(token, provider, value);
  }

  async startOAuth(
    provider: string,
    emit: (event: OAuthServerEvent) => void,
    signal: AbortSignal,
  ): Promise<void> {
    try {
      await this.credentials.startOAuth(
        provider,
        {
          emit,
          requestInput: async (input) => {
            const pending = this.pendingInputs.create(provider, signal);
            if (input.options) {
              emit({
                type: "select",
                token: pending.token,
                message: input.message,
                options: input.options,
              });
            } else {
              emit({
                type: "prompt",
                token: pending.token,
                message: input.message,
                placeholder: input.placeholder,
                allowEmpty: input.allowEmpty,
              });
            }
            return pending.promise;
          },
        },
        signal,
      );
    } finally {
      this.pendingInputs.rejectProvider(
        provider,
        new Error("OAuth flow ended"),
      );
    }
  }
}
