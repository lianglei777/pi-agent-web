import type {
  DiscoverModelsInput,
  TestModelInput,
} from "@/server/domain/model";
import type { ModelProvider } from "@/server/ports/model-provider";

export class ModelService {
  constructor(private readonly models: ModelProvider) {}

  listAvailable() {
    return this.models.listAvailable();
  }

  getDefault() {
    return this.models.getDefault();
  }

  readConfig() {
    return this.models.readConfig();
  }

  writeConfig(config: Record<string, unknown>) {
    return this.models.writeConfig(config);
  }

  discoverModels(input: DiscoverModelsInput) {
    return this.models.discoverModels(input);
  }

  testConfig(input: TestModelInput) {
    return this.models.testConfig(input);
  }
}

