import { describe, expect, it } from "vitest";
import {
  parseAgentCommand,
  parseCreateAgent,
  parseModelsConfig,
  parseProjectPath,
  parseSkillInstall,
} from "./validators";

describe("agent HTTP validation", () => {
  it("accepts runtime creation without an initial prompt", () => {
    expect(
      parseCreateAgent({
        cwd: "C:\\work",
        provider: "provider",
        modelId: "model",
      }),
    ).toEqual({
      cwd: "C:\\work",
      provider: "provider",
      modelId: "model",
      thinkingLevel: undefined,
      toolNames: undefined,
    });
  });

  it("accepts image-only steer but rejects an empty command", () => {
    expect(
      parseAgentCommand({
        type: "steer",
        message: "",
        images: [{ type: "image", data: "abc", mimeType: "image/png" }],
      }),
    ).toMatchObject({ type: "steer", message: "" });
    expect(() =>
      parseAgentCommand({ type: "prompt", message: "", images: [] }),
    ).toThrow("message or images must be provided");
  });

  it("accepts the skills market package contract", () => {
    expect(
      parseSkillInstall({
        package: "owner/repo@demo",
        scope: "project",
        cwd: "C:\\work",
      }),
    ).toEqual({
      packageSpec: "owner/repo@demo",
      scope: "project",
      cwd: "C:\\work",
    });
  });

  it("sanitizes protocol-specific model compatibility fields", () => {
    expect(
      parseModelsConfig({
        providers: {
          custom: {
            api: "openai-responses",
            compat: {
              sendSessionIdHeader: false,
              supportsDeveloperRole: false,
            },
          },
        },
      }),
    ).toEqual({
      providers: {
        custom: {
          api: "openai-responses",
          compat: { sendSessionIdHeader: false },
        },
      },
    });
  });

  it("rejects unsupported model API protocols", () => {
    expect(() =>
      parseModelsConfig({
        providers: { custom: { api: "future-api" } },
      }),
    ).toThrow("Unsupported API protocol: future-api");
  });

  it("validates project path bodies", () => {
    expect(parseProjectPath({ path: " /work/app " })).toEqual({
      path: "/work/app",
    });
    expect(() => parseProjectPath({ path: "" })).toThrow(
      "path must be a non-empty string",
    );
  });
});
