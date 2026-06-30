import { describe, expect, it, vi } from "vitest";
import type { ProcessRunner } from "@/server/ports/process-runner";
import {
  buildInstallArgs,
  buildRemoveArgs,
  displaySkillPath,
  parseCliSearch,
  PiSkillProvider,
  updateSkillFrontmatter,
  validatePackageSpec,
} from "./pi-skill-provider";

describe("PiSkillProvider helpers", () => {
  it("preserves BOM, CRLF, comments, and unrelated frontmatter", () => {
    const source =
      "\uFEFF---\r\nname: demo\r\ndisable-model-invocation: false # keep\r\ntags: [one]\r\n---\r\nBody";
    const disabled = updateSkillFrontmatter(source, true);

    expect(disabled).toContain(
      "disable-model-invocation: true # keep\r\n",
    );
    expect(disabled).toContain("tags: [one]");
    expect(disabled.startsWith("\uFEFF---\r\n")).toBe(true);
    expect(updateSkillFrontmatter(disabled, false)).not.toContain(
      "disable-model-invocation",
    );
  });

  it("adds frontmatter without rewriting existing content", () => {
    expect(updateSkillFrontmatter("# Demo\nBody", true)).toBe(
      "---\ndisable-model-invocation: true\n---\n# Demo\nBody",
    );
  });

  it("formats project, home, and absolute paths cross-platform", () => {
    expect(
      displaySkillPath(
        "C:\\work\\repo\\.pi\\skills\\demo\\SKILL.md",
        "C:\\work\\repo",
        "C:\\Users\\me",
      ),
    ).toBe(".pi\\skills\\demo\\SKILL.md");
    expect(
      displaySkillPath(
        "/home/me/.pi/agent/skills/demo/SKILL.md",
        "/work/repo",
        "/home/me",
      ),
    ).toBe("~/.pi/agent/skills/demo/SKILL.md");
  });

  it("strips ANSI and deduplicates CLI search results", () => {
    expect(
      parseCliSearch(
        "\u001b[32mowner/repo@demo\u001b[0m\nowner/repo@demo\nx/y@other",
        10,
      ),
    ).toEqual([
      expect.objectContaining({ packageSpec: "owner/repo@demo" }),
      expect.objectContaining({ packageSpec: "x/y@other" }),
    ]);
  });

  it("builds install commands as argument arrays", () => {
    expect(
      buildInstallArgs("C:\\npm\\npx-cli.js", {
        packageSpec: "owner/repo@demo",
        scope: "global",
      }),
    ).toEqual([
      "C:\\npm\\npx-cli.js",
      "--yes",
      "skills",
      "add",
      "owner/repo@demo",
      "-y",
      "--agent",
      "pi",
      "-g",
    ]);
    expect(() => validatePackageSpec("owner/repo; rm -rf")).toThrow(
      "valid skills package reference",
    );
  });

  it("builds remove commands as argument arrays", () => {
    expect(
      buildRemoveArgs("C:\\npm\\npx-cli.js", "react-testing", "project"),
    ).toEqual([
      "C:\\npm\\npx-cli.js",
      "--yes",
      "skills",
      "remove",
      "react-testing",
      "-y",
      "--agent",
      "pi",
    ]);
    expect(
      buildRemoveArgs("C:\\npm\\npx-cli.js", "react-testing", "global"),
    ).toEqual([
      "C:\\npm\\npx-cli.js",
      "--yes",
      "skills",
      "remove",
      "react-testing",
      "-y",
      "--agent",
      "pi",
      "-g",
    ]);
  });

  it("falls back to the CLI when market search fails", async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new Error("offline"));
    const run = vi.fn().mockResolvedValue({
      stdout: "owner/repo@demo\n",
      stderr: "",
    });
    try {
      const provider = new PiSkillProvider({ run } as ProcessRunner);
      await expect(provider.search("demo", 10)).resolves.toEqual([
        expect.objectContaining({ packageSpec: "owner/repo@demo" }),
      ]);
      expect(run).toHaveBeenCalledWith(
        process.execPath,
        expect.arrayContaining(["skills", "find", "demo"]),
        expect.objectContaining({ timeoutMs: 20_000 }),
      );
    } finally {
      global.fetch = originalFetch;
    }
  });
});
