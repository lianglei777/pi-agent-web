import { promises as fs } from "node:fs";
import {
  getAgentDir,
  loadSkills,
} from "@earendil-works/pi-coding-agent";
import { AppError } from "@/server/domain/app-error";
import type {
  InstallSkillInput,
  SkillSearchResult,
} from "@/server/domain/skill";
import type { ProcessRunner } from "@/server/ports/process-runner";
import type { SkillProvider } from "@/server/ports/skill-provider";

export class PiSkillProvider implements SkillProvider {
  constructor(private readonly processes: ProcessRunner) {}

  async load(cwd: string) {
    const result = loadSkills({
      cwd,
      agentDir: getAgentDir(),
      skillPaths: [],
      includeDefaults: true,
    });
    return {
      skills: result.skills.map((skill) => ({
        name: skill.name,
        description: skill.description,
        filePath: skill.filePath,
        baseDir: skill.baseDir,
        source: skill.sourceInfo.source,
        disableModelInvocation: skill.disableModelInvocation,
      })),
      diagnostics: result.diagnostics.map((diagnostic) => ({
        severity: diagnostic.type,
        message: diagnostic.message,
        path: diagnostic.path,
      })),
    };
  }

  async setModelInvocationDisabled(
    filePath: string,
    disabled: boolean,
  ): Promise<void> {
    const content = await fs.readFile(filePath, "utf8");
    await fs.writeFile(filePath, updateFrontmatter(content, disabled), "utf8");
  }

  async search(query: string, limit: number): Promise<SkillSearchResult[]> {
    try {
      return await searchSkillsApi(query, limit);
    } catch {
      return this.searchWithCli(query, limit);
    }
  }

  private async searchWithCli(
    query: string,
    limit: number,
  ): Promise<SkillSearchResult[]> {
    try {
      const { stdout } = await this.processes.run(
        process.platform === "win32" ? "npx.cmd" : "npx",
        ["--yes", "skills", "find", query],
        { timeoutMs: 20_000 },
      );
      return parseCliSearch(stdout, limit);
    } catch {
      return [];
    }
  }

  async install(input: InstallSkillInput) {
    const args = ["--yes", "skills", "add", input.source, "--yes"];
    if (input.scope === "global") args.push("--global");
    try {
      const result = await this.processes.run(
        process.platform === "win32" ? "npx.cmd" : "npx",
        args,
        { cwd: input.cwd, timeoutMs: 60_000 },
      );
      return { installed: true, ...result };
    } catch (error) {
      throw new AppError(
        "SKILL_INSTALL_FAILED",
        error instanceof Error ? error.message : String(error),
        500,
      );
    }
  }
}

async function searchSkillsApi(
  query: string,
  limit: number,
): Promise<SkillSearchResult[]> {
  const url = new URL("https://skills.sh/api/search");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(limit));
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) {
    throw new Error(`Skill search returned ${response.status}`);
  }
  const payload = (await response.json()) as unknown;
  if (!payload || typeof payload !== "object") return [];
  const skills = (payload as { skills?: unknown }).skills;
  if (!Array.isArray(skills)) return [];
  return skills.slice(0, limit).flatMap(mapApiSkill);
}

function mapApiSkill(value: unknown): SkillSearchResult[] {
  if (!value || typeof value !== "object") return [];
  const item = value as Record<string, unknown>;
  const name = typeof item.name === "string" ? item.name : "";
  const source = typeof item.source === "string" ? item.source : "";
  if (!name || !source) return [];
  return [
    {
      name,
      description: "",
      source,
      installRef: `${source}@${name}`,
    },
  ];
}

function parseCliSearch(
  output: string,
  limit: number,
): SkillSearchResult[] {
  const clean = output.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "");
  const results: SkillSearchResult[] = [];
  const seen = new Set<string>();
  for (const line of clean.split(/\r?\n/)) {
    const match = line.trim().match(/^([^\s]+\/[^\s]+)@([^\s]+)(?:\s|$)/);
    if (!match) continue;
    const installRef = `${match[1]}@${match[2]}`;
    if (seen.has(installRef)) continue;
    seen.add(installRef);
    results.push({
      name: match[2],
      description: "",
      source: match[1],
      installRef,
    });
    if (results.length >= limit) break;
  }
  return results;
}

function updateFrontmatter(content: string, disabled: boolean): string {
  const line = "disable-model-invocation: true";
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return disabled ? `---\n${line}\n---\n${content}` : content;
  }

  const frontmatter = match[1];
  const pattern = /^disable-model-invocation\s*:.*$/m;
  const next = disabled
    ? pattern.test(frontmatter)
      ? frontmatter.replace(pattern, line)
      : `${frontmatter}\n${line}`
    : frontmatter.replace(pattern, "").replace(/\n{2,}/g, "\n").trim();
  return content.replace(match[0], `---\n${next}\n---`);
}
