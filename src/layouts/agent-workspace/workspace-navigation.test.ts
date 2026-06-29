import { describe, expect, it } from "vitest";
import { shouldConfirmWorkspaceNavigation } from "./workspace-navigation";

describe("workspace navigation guard", () => {
  it("guards only dirty Model Provider navigation", () => {
    expect(shouldConfirmWorkspaceNavigation("model-provider", true)).toBe(true);
    expect(shouldConfirmWorkspaceNavigation("model-provider", false)).toBe(false);
    expect(shouldConfirmWorkspaceNavigation("chat", true)).toBe(false);
    expect(shouldConfirmWorkspaceNavigation("skills", true)).toBe(false);
  });
});
