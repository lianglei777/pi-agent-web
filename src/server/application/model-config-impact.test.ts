import { describe, expect, it } from "vitest";
import { getModelConfigInvalidation } from "./model-config-impact";

describe("getModelConfigInvalidation", () => {
  it("targets only a changed model", () => {
    const previous = {
      providers: {
        custom: {
          api: "openai-completions",
          models: [
            {
              id: "model-a",
              compat: { supportsDeveloperRole: true },
            },
            { id: "model-b" },
          ],
        },
      },
    };
    const next = {
      providers: {
        custom: {
          api: "openai-completions",
          models: [
            {
              id: "model-a",
              compat: { supportsDeveloperRole: false },
            },
            { id: "model-b" },
          ],
        },
      },
    };

    expect(getModelConfigInvalidation(previous, next)).toEqual({
      scope: "targets",
      targets: [{ provider: "custom", modelId: "model-a" }],
    });
  });

  it("targets the whole provider when provider request config changes", () => {
    expect(
      getModelConfigInvalidation(
        {
          providers: {
            custom: {
              baseUrl: "https://old.example/v1",
              models: [{ id: "model-a" }],
            },
          },
        },
        {
          providers: {
            custom: {
              baseUrl: "https://new.example/v1",
              models: [{ id: "model-a" }],
            },
          },
        },
      ),
    ).toEqual({
      scope: "targets",
      targets: [{ provider: "custom" }],
    });
  });

  it("targets a model whose model override changes", () => {
    expect(
      getModelConfigInvalidation(
        {
          providers: {
            openai: {
              modelOverrides: {
                "model-a": {
                  compat: { supportsDeveloperRole: true },
                },
              },
            },
          },
        },
        {
          providers: {
            openai: {
              modelOverrides: {
                "model-a": {
                  compat: { supportsDeveloperRole: false },
                },
              },
            },
          },
        },
      ),
    ).toEqual({
      scope: "targets",
      targets: [{ provider: "openai", modelId: "model-a" }],
    });
  });

  it("ignores runtime-neutral metadata changes", () => {
    expect(
      getModelConfigInvalidation(
        {
          revisionLabel: "old",
          providers: {
            custom: {
              name: "Old display name",
              models: [{ id: "model-a" }],
            },
          },
        },
        {
          revisionLabel: "new",
          providers: {
            custom: {
              name: "New display name",
              models: [{ id: "model-a" }],
            },
          },
        },
      ),
    ).toBeNull();
  });

  it("falls back to all runtimes for ambiguous model definitions", () => {
    expect(
      getModelConfigInvalidation(
        { providers: {} },
        {
          providers: {
            custom: {
              models: [{ id: "duplicate" }, { id: "duplicate" }],
            },
          },
        },
      ),
    ).toEqual({ scope: "all" });
  });
});
