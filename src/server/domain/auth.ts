export interface OAuthProviderInfo {
  id: string;
  name: string;
}

export interface ApiKeyProviderInfo {
  id: string;
  name: string;
}

export interface ApiKeyStatus {
  configured: boolean;
  source?: string;
  label?: string;
}

export type OAuthServerEvent =
  | { type: "auth"; url: string; instructions?: string }
  | {
      type: "device_code";
      userCode: string;
      verificationUri: string;
      intervalSeconds?: number;
      expiresInSeconds?: number;
    }
  | {
      type: "prompt";
      token: string;
      message: string;
      placeholder?: string;
      allowEmpty?: boolean;
    }
  | {
      type: "select";
      token: string;
      message: string;
      options: Array<{ id: string; label: string }>;
    }
  | { type: "progress"; message: string }
  | { type: "error"; message: string }
  | { type: "complete" };

export interface OAuthCallbacks {
  emit(event: OAuthServerEvent): void;
  requestInput(input: {
    provider: string;
    message: string;
    placeholder?: string;
    allowEmpty?: boolean;
    options?: Array<{ id: string; label: string }>;
  }): Promise<string>;
}
