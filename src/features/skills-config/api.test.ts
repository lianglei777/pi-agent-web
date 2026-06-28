import { afterEach, describe, expect, it, vi } from "vitest";
import { installSkill, setSkillModelInvocation } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("skills config API client", () => {
  it("sends secure toggle identity without a file path", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ skills: [], diagnostics: [] }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await setSkillModelInvocation({
      cwd: "/work",
      skillId: "skill-id",
      disabled: true,
      expectedVersion: "version",
    });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({
      cwd: "/work",
      skillId: "skill-id",
      disabled: true,
      expectedVersion: "version",
    });
  });

  it("sends project/global install requests with the selected cwd", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ installed: true, skills: [] }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await installSkill({
      package: "owner/repo@demo",
      scope: "project",
      cwd: "/work",
    });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({
      package: "owner/repo@demo",
      scope: "project",
      cwd: "/work",
    });
  });
});
