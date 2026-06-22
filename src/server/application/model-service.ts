import type {
  DiscoverModelsInput,
  TestModelInput,
} from "@/server/domain/model";
import type { AgentRuntimeRegistry } from "@/server/ports/agent-runtime";
import type { ModelProvider } from "@/server/ports/model-provider";
import { getModelConfigInvalidation } from "./model-config-impact";

export class ModelService {
  constructor(
    private readonly models: ModelProvider,
    private readonly runtimes: AgentRuntimeRegistry,
  ) {}

  listAvailable() {
    return this.models.listAvailable();
  }

  getDefault() {
    return this.models.getDefault();
  }

  readConfig() {
    return this.models.readConfig();
  }

  async writeConfig(config: Record<string, unknown>) {
    let previousConfig: Record<string, unknown> | undefined;
    try {
      previousConfig = await this.models.readConfig();
    } catch {
      // 旧配置不可读时仍允许覆盖写入，并在成功后保守刷新全部运行时。
    }
    await this.models.writeConfig(config);
    const invalidation = previousConfig
      ? getModelConfigInvalidation(previousConfig, config)
      : { scope: "all" as const };
    if (invalidation) {
      this.runtimes.invalidateModelConfig(invalidation);
    }
  }

  discoverModels(input: DiscoverModelsInput) {
    return this.models.discoverModels(input);
  }

  testConfig(input: TestModelInput) {
    return this.models.testConfig(input);
  }
}

