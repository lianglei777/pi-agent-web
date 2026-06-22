import { isDeepStrictEqual } from "node:util";
import type {
  ModelConfigInvalidation,
  ModelConfigTarget,
} from "@/server/ports/agent-runtime";

const PROVIDER_RUNTIME_KEYS = [
  "baseUrl",
  "apiKey",
  "api",
  "headers",
  "compat",
  "authHeader",
] as const;

const PROVIDER_KNOWN_KEYS = new Set([
  "name",
  ...PROVIDER_RUNTIME_KEYS,
  "models",
  "modelOverrides",
]);

type ModelMapResult =
  | { ok: true; values: Map<string, Record<string, unknown>> }
  | { ok: false };

/**
 * 比较新旧 Models Config，返回需要失效的最小运行时范围。
 */
export function getModelConfigInvalidation(
  previous: unknown,
  next: unknown,
): ModelConfigInvalidation | null {
  const previousProviders = readProviders(previous);
  const nextProviders = readProviders(next);
  if (!previousProviders || !nextProviders) return { scope: "all" };

  const providerTargets = new Set<string>();
  const modelTargets = new Map<string, ModelConfigTarget>();
  const providerNames = new Set([
    ...Object.keys(previousProviders),
    ...Object.keys(nextProviders),
  ]);

  for (const provider of [...providerNames].sort()) {
    const previousValue = previousProviders[provider];
    const nextValue = nextProviders[provider];
    if (
      (previousValue !== undefined && !isRecord(previousValue)) ||
      (nextValue !== undefined && !isRecord(nextValue))
    ) {
      return { scope: "all" };
    }

    if (!previousValue || !nextValue) {
      const presentValue = previousValue ?? nextValue;
      if (!presentValue || !hasValidModelCollections(presentValue)) {
        return { scope: "all" };
      }
      providerTargets.add(provider);
      continue;
    }

    if (hasChangedUnknownProviderField(previousValue, nextValue)) {
      return { scope: "all" };
    }

    const previousModels = readModels(previousValue.models);
    const nextModels = readModels(nextValue.models);
    const previousOverrides = readModelOverrides(previousValue.modelOverrides);
    const nextOverrides = readModelOverrides(nextValue.modelOverrides);
    if (
      !previousModels.ok ||
      !nextModels.ok ||
      !previousOverrides.ok ||
      !nextOverrides.ok
    ) {
      return { scope: "all" };
    }

    if (
      PROVIDER_RUNTIME_KEYS.some(
        (key) => !isDeepStrictEqual(previousValue[key], nextValue[key]),
      )
    ) {
      providerTargets.add(provider);
      continue;
    }

    collectChangedModels(
      provider,
      previousModels.values,
      nextModels.values,
      modelTargets,
    );
    collectChangedModels(
      provider,
      previousOverrides.values,
      nextOverrides.values,
      modelTargets,
    );
  }

  if (providerTargets.size === 0 && modelTargets.size === 0) return null;

  const targets: ModelConfigTarget[] = [
    ...[...providerTargets]
      .sort()
      .map((provider) => ({ provider })),
    ...[...modelTargets.values()]
      .filter((target) => !providerTargets.has(target.provider))
      .sort(compareTargets),
  ];
  return { scope: "targets", targets };
}

function readProviders(
  config: unknown,
): Record<string, unknown> | null {
  if (!isRecord(config)) return null;
  if (config.providers === undefined) return {};
  return isRecord(config.providers) ? config.providers : null;
}

function hasValidModelCollections(provider: Record<string, unknown>): boolean {
  return (
    readModels(provider.models).ok &&
    readModelOverrides(provider.modelOverrides).ok
  );
}

function hasChangedUnknownProviderField(
  previous: Record<string, unknown>,
  next: Record<string, unknown>,
): boolean {
  const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
  for (const key of keys) {
    if (
      !PROVIDER_KNOWN_KEYS.has(key) &&
      !isDeepStrictEqual(previous[key], next[key])
    ) {
      return true;
    }
  }
  return false;
}

function readModels(value: unknown): ModelMapResult {
  if (value === undefined) return { ok: true, values: new Map() };
  if (!Array.isArray(value)) return { ok: false };

  const values = new Map<string, Record<string, unknown>>();
  for (const model of value) {
    if (!isRecord(model) || typeof model.id !== "string" || !model.id) {
      return { ok: false };
    }
    if (values.has(model.id)) return { ok: false };
    values.set(model.id, model);
  }
  return { ok: true, values };
}

function readModelOverrides(value: unknown): ModelMapResult {
  if (value === undefined) return { ok: true, values: new Map() };
  if (!isRecord(value)) return { ok: false };

  const values = new Map<string, Record<string, unknown>>();
  for (const [modelId, override] of Object.entries(value)) {
    if (!modelId || !isRecord(override)) return { ok: false };
    values.set(modelId, override);
  }
  return { ok: true, values };
}

function collectChangedModels(
  provider: string,
  previous: Map<string, Record<string, unknown>>,
  next: Map<string, Record<string, unknown>>,
  targets: Map<string, ModelConfigTarget>,
) {
  const modelIds = new Set([...previous.keys(), ...next.keys()]);
  for (const modelId of modelIds) {
    if (!isDeepStrictEqual(previous.get(modelId), next.get(modelId))) {
      targets.set(`${provider}\u0000${modelId}`, { provider, modelId });
    }
  }
}

function compareTargets(
  left: ModelConfigTarget,
  right: ModelConfigTarget,
): number {
  return (
    left.provider.localeCompare(right.provider) ||
    (left.modelId ?? "").localeCompare(right.modelId ?? "")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
