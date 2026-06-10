import path from "node:path";
import {
  AuthStorage,
  getAgentDir,
  ModelRegistry,
} from "@earendil-works/pi-coding-agent";
import { AppError } from "@/server/domain/app-error";
import type { OAuthCallbacks } from "@/server/domain/auth";
import type { CredentialProvider } from "@/server/ports/credential-provider";

export class PiCredentialProvider implements CredentialProvider {
  private readonly auth = AuthStorage.create(
    path.join(getAgentDir(), "auth.json"),
  );

  async listOAuthProviders() {
    return this.auth
      .getOAuthProviders()
      .map((provider) => ({ id: provider.id, name: provider.name }));
  }

  async listApiKeyProviders() {
    const registry = ModelRegistry.create(
      this.auth,
      path.join(getAgentDir(), "models.json"),
    );
    const ids = new Set(registry.getAll().map((model) => model.provider));
    return [...ids]
      .sort()
      .map((id) => ({ id, name: registry.getProviderDisplayName(id) }));
  }

  async getApiKeyStatus(provider: string) {
    return this.auth.getAuthStatus(provider);
  }

  async setApiKey(provider: string, apiKey: string): Promise<void> {
    this.auth.set(provider, { type: "api_key", key: apiKey });
  }

  async removeApiKey(provider: string): Promise<void> {
    this.auth.remove(provider);
  }

  async startOAuth(
    provider: string,
    callbacks: OAuthCallbacks,
    signal: AbortSignal,
  ): Promise<void> {
    const oauth = this.auth
      .getOAuthProviders()
      .find((candidate) => candidate.id === provider);
    if (!oauth) {
      throw new AppError(
        "OAUTH_PROVIDER_NOT_FOUND",
        `OAuth provider ${provider} was not found`,
        404,
      );
    }

    await this.auth.login(provider, {
      signal,
      onAuth: (info) => callbacks.emit({ type: "auth", ...info }),
      onDeviceCode: (info) =>
        callbacks.emit({ type: "device_code", ...info }),
      onProgress: (message) =>
        callbacks.emit({ type: "progress", message }),
      onPrompt: (prompt) =>
        callbacks.requestInput({ provider, ...prompt }),
      onManualCodeInput: () =>
        callbacks.requestInput({
          provider,
          message: "Enter the authorization code",
        }),
      onSelect: async (prompt) =>
        callbacks.requestInput({ provider, ...prompt }),
    });
    callbacks.emit({ type: "complete" });
  }

  async logout(provider: string): Promise<void> {
    this.auth.logout(provider);
  }
}

