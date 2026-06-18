export type DialogCloseSource = "backdrop" | "escape" | "explicit";

export type DialogCloseDecision = "stay" | "close" | "confirm-discard";

export function resolveDialogClose({
  source,
  dirty,
}: {
  source: DialogCloseSource;
  dirty: boolean;
}): DialogCloseDecision {
  if (source !== "explicit") return "stay";
  return dirty ? "confirm-discard" : "close";
}

export function isDialogDirty(baseline: unknown, current: unknown) {
  return stableSerialize(baseline) !== stableSerialize(current);
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries
      .map(([key, child]) => `${JSON.stringify(key)}:${stableSerialize(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
