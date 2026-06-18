import { describe, expect, it } from "vitest";
import {
  getDefaultThinkingOnLevel,
  getSupportedConfiguredThinkingLevels,
  shouldDisplaySourceBadge,
} from "./model-detail-state";

describe("model detail display state", () => {
  it("hides the source badge when no source is known", () => {
    expect(shouldDisplaySourceBadge(undefined)).toBe(false);
    expect(shouldDisplaySourceBadge("catalog")).toBe(true);
  });

  it("derives supported configured thinking levels from the map", () => {
    expect(
      getSupportedConfiguredThinkingLevels({
        id: "reasoner",
        reasoning: true,
        thinkingLevelMap: {
          minimal: null,
          low: "low",
          medium: "medium",
          high: "high",
          xhigh: "max",
        },
      }),
    ).toEqual(["low", "medium", "high", "xhigh"]);
  });

  it("defaults Thinking On to high when possible", () => {
    expect(
      getDefaultThinkingOnLevel({
        id: "reasoner",
        reasoning: true,
        thinkingLevelMap: { high: "high", xhigh: "max" },
      }),
    ).toBe("high");
  });
});
