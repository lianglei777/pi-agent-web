import type {
  DiscoverModelsInput,
  DiscoverModelsResult,
  ModelInfo,
  TestModelInput,
  TestModelResult,
} from "@/server/domain/model";

export interface ModelProvider {
  listAvailable(): Promise<ModelInfo[]>;
  getDefault(): Promise<{
    provider: string;
    modelId: string;
  } | null>;
  readConfig(): Promise<Record<string, unknown>>;
  writeConfig(config: Record<string, unknown>): Promise<void>;
  discoverModels(input: DiscoverModelsInput): Promise<DiscoverModelsResult>;
  testConfig(input: TestModelInput): Promise<TestModelResult>;
}

