import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  AuthStorage,
  createAgentSession,
  getAgentDir,
  ModelRegistry,
  SessionManager,
} from "@earendil-works/pi-coding-agent";
import {
  getModels,
  getProviders,
  getSupportedThinkingLevels,
} from "@earendil-works/pi-ai";
import type { ThinkingLevel } from "@/server/domain/agent-command";
import type {
  DiscoverModelsInput,
  DiscoverModelsResult,
  ModelInfo,
  TestModelInput,
  TestModelResult,
} from "@/server/domain/model";
import type { ModelProvider } from "@/server/ports/model-provider";
import {
  buildModelDiscoverySuggestions,
  fetchOpenAICompatibleModels,
} from "./model-discovery";

export class PiModelProvider implements ModelProvider {
  private readonly auth = AuthStorage.create(
    path.join(getAgentDir(), "auth.json"),
  );

  async listAvailable(): Promise<ModelInfo[]> {
    const config = await this.readConfig();
    const thinkingDefaults = getThinkingDefaultLevels(config);
    const registry = ModelRegistry.create(
      this.auth,
      path.join(getAgentDir(), "models.json"),
    );
    return registry.getAvailable().map((model) => ({
      id: model.id,
      name: model.name,
      provider: model.provider,
      contextWindow: model.contextWindow,
      maxTokens: model.maxTokens,
      input: model.input,
      thinkingLevels: [
        "auto",
        ...getSupportedThinkingLevels(model),
      ] as ThinkingLevel[],
      thinkingDefaultLevel: thinkingDefaults.get(
        modelRequestKey(model.provider, model.id),
      ),
      thinkingLevelMap: model.thinkingLevelMap,
    }));
  }

  async getDefault(): Promise<{
    provider: string;
    modelId: string;
  } | null> {
    const first = (await this.listAvailable())[0];
    return first ? { provider: first.provider, modelId: first.id } : null;
  }

  async readConfig(): Promise<Record<string, unknown>> {
    try {
      return JSON.parse(
        await fs.readFile(path.join(getAgentDir(), "models.json"), "utf8"),
      ) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  async writeConfig(config: Record<string, unknown>): Promise<void> {
    const filePath = path.join(getAgentDir(), "models.json");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const temporary = `${filePath}.${process.pid}.tmp`;
    await fs.writeFile(temporary, `${JSON.stringify(config, null, 2)}\n`);
    await fs.rename(temporary, filePath);
  }

  async discoverModels(
    input: DiscoverModelsInput,
  ): Promise<DiscoverModelsResult> {
    return buildModelDiscoverySuggestions(input, {
      fetchModels: fetchOpenAICompatibleModels,
      catalogModels: getProviders().flatMap((provider) => getModels(provider)),
    });
  }

  async testConfig(input: TestModelInput): Promise<TestModelResult> {
    const started = Date.now();
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "pi-model-"));
    const configPath = path.join(directory, "models.json");
    let session:
      | Awaited<ReturnType<typeof createAgentSession>>["session"]
      | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      if (input.config) {
        await fs.writeFile(configPath, JSON.stringify(input.config));
      }
      const registry = ModelRegistry.create(this.auth, configPath);
      const model = registry.find(input.provider, input.modelId);
      if (!model) {
        return { ok: false, error: "Model not found in test configuration" };
      }
      ({ session } = await createAgentSession({
        cwd: directory,
        sessionManager: SessionManager.inMemory(directory),
        model,
        noTools: "all",
      }));
      session.setAutoRetryEnabled(false);
      const timeoutMs = input.timeoutMs ?? 15_000;
      await Promise.race([
        session.prompt("Reply with OK only."),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => {
            void session?.abort();
            reject(new Error("Model test timed out"));
          }, timeoutMs);
        }),
      ]);
      const responseText = session.getLastAssistantText();
      return { ok: true, latencyMs: Date.now() - started, responseText };
    } catch (error) {
      return {
        ok: false,
        latencyMs: Date.now() - started,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      if (timeout) clearTimeout(timeout);
      session?.dispose();
      await fs.rm(directory, { recursive: true, force: true });
    }
  }
}

function modelRequestKey(provider: string, modelId: string) {
  return `${provider}:${modelId}`;
}

function getThinkingDefaultLevels(config: Record<string, unknown>) {
  const defaults = new Map<string, Exclude<ThinkingLevel, "auto" | "off">>();
  const providers =
    typeof config.providers === "object" && config.providers !== null
      ? (config.providers as Record<string, unknown>)
      : {};
  for (const [providerName, providerValue] of Object.entries(providers)) {
    if (typeof providerValue !== "object" || providerValue === null) continue;
    const models = (providerValue as { models?: unknown }).models;
    if (!Array.isArray(models)) continue;
    for (const model of models) {
      if (typeof model !== "object" || model === null) continue;
      const entry = model as {
        id?: unknown;
        thinkingDefaultLevel?: unknown;
      };
      if (
        typeof entry.id === "string" &&
        isConfiguredThinkingLevel(entry.thinkingDefaultLevel)
      ) {
        defaults.set(
          modelRequestKey(providerName, entry.id),
          entry.thinkingDefaultLevel,
        );
      }
    }
  }
  return defaults;
}

function isConfiguredThinkingLevel(
  value: unknown,
): value is Exclude<ThinkingLevel, "auto" | "off"> {
  return (
    value === "minimal" ||
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "xhigh"
  );
}
