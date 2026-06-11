import { describe, expect, it } from "vitest";
import { minimapSeek, minimapViewport } from "./minimap-logic";

describe("chat minimap logic", () => {
  it("hides short conversations and maps a long viewport", () => {
    expect(minimapViewport(0, 500, 490).visible).toBe(false);
    expect(minimapViewport(250, 1000, 250)).toEqual({
      visible: true,
      top: 0.25,
      height: 0.25,
    });
  });

  it("clamps click seeking to the document", () => {
    expect(minimapSeek(150, 100, 100, 1000)).toBe(500);
    expect(minimapSeek(250, 100, 100, 1000)).toBe(1000);
  });
});
