import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { SkillProvider } from "@/server/ports/skill-provider";
import { SkillService } from "./skill-service";

describe("SkillService", () => {
  it("passes only registered cwd values to the provider", async () => {
    const load = vi.fn().mockResolvedValue({
      skills: [],
      diagnostics: [],
    });
    const provider = { load } as unknown as SkillProvider;
    const root = path.resolve("C:\\workspace");
    const service = new SkillService(provider, {
      listRoots: async () => [root],
      addRoot: vi.fn(),
    });

    await service.load(root);
    expect(load).toHaveBeenCalledWith(root);
    await service.load(path.join(root, "nested"));
    await expect(service.load(path.resolve("C:\\outside"))).rejects.toMatchObject(
      { status: 403 },
    );
  });

  it("resolves toggles by cwd and skillId rather than a client path", async () => {
    const setModelInvocationDisabled = vi.fn().mockResolvedValue({
      skills: [],
      diagnostics: [],
    });
    const root = path.resolve("C:\\workspace");
    const service = new SkillService(
      { setModelInvocationDisabled } as unknown as SkillProvider,
      { listRoots: async () => [root], addRoot: vi.fn() },
    );

    await service.setModelInvocationDisabled({
      cwd: root,
      skillId: "opaque-id",
      disabled: true,
      expectedVersion: "v1",
    });
    expect(setModelInvocationDisabled).toHaveBeenCalledWith({
      cwd: root,
      skillId: "opaque-id",
      disabled: true,
      expectedVersion: "v1",
    });
  });
});
