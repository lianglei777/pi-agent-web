import {
  THINKING_LEVELS,
  type AgentCommand,
  type ImageInput,
  type ThinkingLevel,
} from "@/server/domain/agent-command";
import { AppError } from "@/server/domain/app-error";
import type { CreateAgentRequest } from "@/server/application/agent-service";
import type { InstallSkillInput } from "@/server/domain/skill";
import type { TestModelInput } from "@/server/domain/model";

type JsonObject = Record<string, unknown>;

export function asObject(value: unknown, name = "body"): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    invalid(`${name} must be an object`);
  }
  return value as JsonObject;
}

export function requiredString(
  object: JsonObject,
  key: string,
): string {
  const value = object[key];
  if (typeof value !== "string" || !value.trim()) {
    invalid(`${key} must be a non-empty string`);
  }
  return value;
}

export function optionalString(
  object: JsonObject,
  key: string,
): string | undefined {
  const value = object[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string") invalid(`${key} must be a string`);
  return value;
}

export function requiredBoolean(
  object: JsonObject,
  key: string,
): boolean {
  const value = object[key];
  if (typeof value !== "boolean") invalid(`${key} must be a boolean`);
  return value;
}

export function parseCreateAgent(value: unknown): CreateAgentRequest {
  const object = asObject(value);
  const images = parseImages(object.images);
  return {
    cwd: requiredString(object, "cwd"),
    message: messageOrImages(object, images),
    images,
    provider: optionalString(object, "provider"),
    modelId: optionalString(object, "modelId"),
    thinkingLevel:
      object.thinkingLevel === undefined
        ? undefined
        : parseThinkingLevel(object.thinkingLevel),
    toolNames: parseStringArray(object.toolNames, "toolNames"),
  };
}

export function parseAgentCommand(value: unknown): AgentCommand {
  const object = asObject(value);
  const type = requiredString(object, "type");
  switch (type) {
    case "prompt":
    case "steer":
    case "follow_up": {
      const images = parseImages(object.images);
      return {
        type,
        message: messageOrImages(object, images),
        images,
      };
    }
    case "abort":
    case "get_state":
    case "get_tools":
    case "abort_compaction":
      return { type };
    case "set_model":
      return {
        type,
        provider: requiredString(object, "provider"),
        modelId: requiredString(object, "modelId"),
      };
    case "fork":
      return { type, entryId: requiredString(object, "entryId") };
    case "navigate_tree":
      return { type, targetId: requiredString(object, "targetId") };
    case "set_thinking_level":
      return { type, level: parseThinkingLevel(object.level) };
    case "compact":
      return {
        type,
        customInstructions: optionalString(object, "customInstructions"),
      };
    case "set_auto_compaction":
    case "set_auto_retry":
      return { type, enabled: requiredBoolean(object, "enabled") };
    case "set_tools":
      return {
        type,
        toolNames: parseStringArray(object.toolNames, "toolNames") ?? [],
      };
    default:
      throw new AppError(
        "UNSUPPORTED_COMMAND",
        `Unsupported command type: ${type}`,
        400,
      );
  }
}

export function parseModelTest(value: unknown): TestModelInput {
  const object = asObject(value);
  const config = object.config;
  return {
    provider: requiredString(object, "provider"),
    modelId: requiredString(object, "modelId"),
    config: config === undefined ? undefined : asObject(config, "config"),
    timeoutMs:
      typeof object.timeoutMs === "number" ? object.timeoutMs : undefined,
  };
}

export function parseSkillInstall(value: unknown): InstallSkillInput {
  const object = asObject(value);
  const scope = requiredString(object, "scope");
  if (scope !== "global" && scope !== "project") {
    invalid("scope must be global or project");
  }
  return {
    source: requiredString(object, "source"),
    scope,
    cwd: optionalString(object, "cwd"),
  };
}

function parseThinkingLevel(value: unknown): ThinkingLevel {
  if (
    typeof value !== "string" ||
    !THINKING_LEVELS.includes(value as ThinkingLevel)
  ) {
    invalid(`thinking level must be one of ${THINKING_LEVELS.join(", ")}`);
  }
  return value as ThinkingLevel;
}

function parseImages(value: unknown): ImageInput[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) invalid("images must be an array");
  return value.map((item, index) => {
    const image = asObject(item, `images[${index}]`);
    return {
      type: "image",
      data: requiredString(image, "data"),
      mimeType: requiredString(image, "mimeType"),
    };
  });
}

function messageOrImages(
  object: JsonObject,
  images: ImageInput[] | undefined,
): string {
  const value = object.message;
  if (typeof value !== "string") invalid("message must be a string");
  if (!value.trim() && !images?.length) {
    invalid("message or images must be provided");
  }
  return value;
}

function parseStringArray(
  value: unknown,
  key: string,
): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    invalid(`${key} must be an array of strings`);
  }
  return value;
}

function invalid(message: string): never {
  throw new AppError("VALIDATION_ERROR", message, 400);
}
