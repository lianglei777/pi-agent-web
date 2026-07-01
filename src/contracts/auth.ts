import type { SseErrorEvent, SuccessResponse } from "./common";

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

export interface ConfiguredApiKeyProviderInfo extends ApiKeyProviderInfo {
  configured: true;
  source?: string;
  label?: string;
  modelCount: number;
}

export type OAuthServerEvent =
  | SseErrorEvent
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
  | { type: "complete" };

export type OAuthProvidersResponse = OAuthProviderInfo[];

export interface AllAuthProvidersResponse {
  oauth: OAuthProviderInfo[];
  apiKey: ApiKeyProviderInfo[];
}

export type ApiKeyStatusResponse = ApiKeyStatus;

export interface SaveApiKeyRequest {
  apiKey: string;
}

export type SaveApiKeyResponse = SuccessResponse;
export type RemoveApiKeyResponse = SuccessResponse;

export interface OAuthInputRequest {
  token: string;
  value: string;
}

export type OAuthInputResponse = SuccessResponse;
export type LogoutOAuthResponse = SuccessResponse;
