import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  DefaultResourceLoader,
  getAgentDir,
  SettingsManager,
  type Skill,
} from "@earendil-works/pi-coding-agent";
import { AppError } from "@/server/domain/app-error";
import type {
  InstallSkillInput,
  RemoveSkillInput,
  SetSkillInvocationInput,
  SkillInfo,
  SkillLoadResult,
  SkillSearchResult,
} from "@/server/domain/skill";
import type { ProcessRunner } from "@/server/ports/process-runner";
import type { SkillProvider } from "@/server/ports/skill-provider";

const ANSI_PATTERN = /\u001b\[[0-?]*[ -/]*[@-~]/g;
const MAX_COMMAND_OUTPUT = 1024 * 1024;

export class PiSkillProvider implements SkillProvider {
  private installRunning = false;
  private readonly fileLocks = new Map<string, Promise<void>>();

  constructor(private readonly processes: ProcessRunner) {}

  async load(cwd: string): Promise<SkillLoadResult> {
    const agentDir = getAgentDir();
    const loader = new DefaultResourceLoader({
      cwd,
      agentDir,
      settingsManager: SettingsManager.create(cwd, agentDir),
    });
    await loader.reload();
    const result = loader.getSkills();
    return {
      skills: await Promise.all(
        result.skills.map((skill) => mapSkill(skill, cwd)),
      ),
      diagnostics: result.diagnostics.map((diagnostic) => ({
        severity: diagnostic.type,
        message: diagnostic.message,
        path: diagnostic.path,
      })),
    };
  }

  async setModelInvocationDisabled(
    input: SetSkillInvocationInput,
  ): Promise<SkillLoadResult> {
    const discovered = await this.load(input.cwd);
    const skill = discovered.skills.find(
      (candidate) => candidate.skillId === input.skillId,
    );
    if (!skill) {
      throw new AppError(
        "SKILL_NOT_FOUND",
        "The selected skill is no longer available. Refresh and try again.",
        404,
      );
    }

    await this.withFileLock(skill.filePath, async () => {
      await updateSkillFile(skill, input.disabled, input.expectedVersion);
    });
    return this.load(input.cwd);
  }

  async search(query: string, limit: number): Promise<SkillSearchResult[]> {
    const normalized = query.trim();
    if (!normalized) return [];
    try {
      return await searchSkillsApi(normalized, limit);
    } catch (apiError) {
      try {
        return await this.searchWithCli(normalized, limit);
      } catch (cliError) {
        throw new AppError(
          "SKILL_SEARCH_FAILED",
          "Skill search is temporarily unavailable.",
          502,
          {
            market:
              apiError instanceof Error ? apiError.message : String(apiError),
            cli:
              cliError instanceof Error ? cliError.message : String(cliError),
          },
        );
      }
    }
  }

  async install(input: InstallSkillInput) {
    validatePackageSpec(input.packageSpec);
    if (this.installRunning) {
      throw new AppError(
        "SKILL_INSTALL_BUSY",
        "Another skill installation is already running.",
        409,
      );
    }

    this.installRunning = true;
    try {
      const cwd = input.cwd ?? process.cwd();
      const before = await this.load(cwd);
      const npxCli = await resolveNpxCli();
      const args = buildInstallArgs(npxCli, input);

      await this.processes.run(process.execPath, args, {
        cwd,
        timeoutMs: 90_000,
        maxOutputBytes: MAX_COMMAND_OUTPUT,
        env: { FORCE_COLOR: "0", NO_COLOR: "1" },
      });
      const after = await this.load(cwd);
      const beforeVersions = new Map(
        before.skills.map((skill) => [skill.skillId, skill.version]),
      );
      const installed = after.skills.filter((skill) => {
        const correctScope =
          input.scope === "global"
            ? skill.sourceInfo.scope === "user"
            : skill.sourceInfo.scope === "project";
        const changed =
          beforeVersions.get(skill.skillId) !== skill.version;
        return correctScope && changed;
      });
      if (installed.length === 0) {
        throw new AppError(
          "SKILL_INSTALL_FAILED",
          "The installer completed, but ResourceLoader could not verify the skill.",
          500,
        );
      }

      for (const skill of installed) {
        if (!skill.disableModelInvocation) {
          await this.withFileLock(skill.filePath, () =>
            updateSkillFile(skill, true, skill.version),
          );
        }
      }
      const verified = await this.load(cwd);
      const installedIds = new Set(installed.map((skill) => skill.skillId));
      return {
        installed: true as const,
        skills: verified.skills.filter((skill) =>
          installedIds.has(skill.skillId),
        ),
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "SKILL_INSTALL_FAILED",
        error instanceof Error ? error.message : String(error),
        500,
      );
    } finally {
      this.installRunning = false;
    }
  }

  async remove(input: RemoveSkillInput): Promise<SkillLoadResult> {
    if (this.installRunning) {
      throw new AppError(
        "SKILL_REMOVE_BUSY",
        "Another skill operation is already running.",
        409,
      );
    }

    this.installRunning = true;
    try {
      const cwd = input.cwd ?? process.cwd();
      const before = await this.load(cwd);
      const skill = before.skills.find(
        (candidate) => candidate.skillId === input.skillId,
      );
      if (!skill) {
        throw new AppError(
          "SKILL_NOT_FOUND",
          "The selected skill is no longer available. Refresh and try again.",
          404,
        );
      }
      if (skill.sourceInfo.scope === "temporary") {
        throw new AppError(
          "VALIDATION_ERROR",
          "Temporary skills cannot be removed from this page.",
          403,
        );
      }
      if (!skill.name.trim() || skill.name.startsWith("-")) {
        throw new AppError(
          "VALIDATION_ERROR",
          "invalid skill name",
          400,
        );
      }

      const removeScope =
        skill.sourceInfo.scope === "user" ? "global" : "project";
      const npxCli = await resolveNpxCli();
      const args = buildRemoveArgs(npxCli, skill.name, removeScope);

      await this.processes.run(process.execPath, args, {
        cwd,
        timeoutMs: 90_000,
        maxOutputBytes: MAX_COMMAND_OUTPUT,
        env: { FORCE_COLOR: "0", NO_COLOR: "1" },
      });

      let after = await this.load(cwd);
      let stillExists = after.skills.some(
        (candidate) => candidate.skillId === input.skillId,
      );
      // CLI 仅管理 lock 文件中记录的 skill；手动放置的 skill（source: "auto"）
      // 不在 lock 中，CLI 报成功但不删文件，回退到直接删除 skill 目录。
      if (stillExists && skill.canModify) {
        const skillDir = path.resolve(skill.baseDir);
        const skillsRoot =
          removeScope === "global"
            ? path.resolve(os.homedir(), ".agents", "skills")
            : path.resolve(cwd, ".agents", "skills");
        const relative = path.relative(skillsRoot, skillDir);
        if (relative && !relative.startsWith("..") && !path.isAbsolute(relative)) {
          await this.withFileLock(skill.filePath, () =>
            fs.rm(skillDir, { recursive: true, force: true }),
          );
        }
        after = await this.load(cwd);
        stillExists = after.skills.some(
          (candidate) => candidate.skillId === input.skillId,
        );
      }
      if (stillExists) {
        throw new AppError(
          "SKILL_REMOVE_FAILED",
          "The remover completed, but the skill is still present.",
          500,
        );
      }
      return after;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "SKILL_REMOVE_FAILED",
        error instanceof Error ? error.message : String(error),
        500,
      );
    } finally {
      this.installRunning = false;
    }
  }

  private async searchWithCli(
    query: string,
    limit: number,
  ): Promise<SkillSearchResult[]> {
    const npxCli = await resolveNpxCli();
    const { stdout } = await this.processes.run(
      process.execPath,
      [npxCli, "--yes", "skills", "find", query],
      {
        timeoutMs: 20_000,
        maxOutputBytes: MAX_COMMAND_OUTPUT,
        env: { FORCE_COLOR: "0", NO_COLOR: "1" },
      },
    );
    return parseCliSearch(stdout, limit);
  }

  private async withFileLock<T>(
    filePath: string,
    work: () => Promise<T>,
  ): Promise<T> {
    const previous = this.fileLocks.get(filePath) ?? Promise.resolve();
    let release = () => {};
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queued = previous.then(() => current);
    this.fileLocks.set(filePath, queued);
    await previous;
    try {
      return await work();
    } finally {
      release();
      if (this.fileLocks.get(filePath) === queued) {
        this.fileLocks.delete(filePath);
      }
    }
  }
}

async function mapSkill(skill: Skill, cwd: string): Promise<SkillInfo> {
  const resolvedFilePath = path.resolve(skill.filePath);
  const realFilePath = await fs.realpath(skill.filePath);
  const content = await fs.readFile(realFilePath);
  return {
    skillId: skillIdForPath(realFilePath),
    name: skill.name,
    description: skill.description,
    filePath: realFilePath,
    displayPath: displaySkillPath(realFilePath, cwd, os.homedir()),
    baseDir: await fs.realpath(skill.baseDir),
    sourceInfo: {
      path: skill.sourceInfo.path,
      source: skill.sourceInfo.source,
      scope: skill.sourceInfo.scope,
      origin: skill.sourceInfo.origin,
      baseDir: skill.sourceInfo.baseDir,
    },
    canModify: samePath(resolvedFilePath, realFilePath),
    disableModelInvocation: skill.disableModelInvocation,
    version: versionForContent(content),
  };
}

async function updateSkillFile(
  skill: SkillInfo,
  disabled: boolean,
  expectedVersion?: string,
): Promise<void> {
  if (!skill.canModify) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Skills discovered through symlinks cannot be modified.",
      403,
    );
  }
  const requested = path.resolve(skill.filePath);
  const realFilePath = await fs.realpath(requested);
  if (!samePath(realFilePath, requested)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Symlinked skill files cannot be modified.",
      403,
    );
  }
  if (skillIdForPath(realFilePath) !== skill.skillId) {
    throw new AppError("VALIDATION_ERROR", "Skill path validation failed.", 403);
  }

  const stat = await fs.stat(realFilePath);
  const original = await fs.readFile(realFilePath);
  const originalVersion = versionForContent(original);
  if (expectedVersion && originalVersion !== expectedVersion) {
    throw new AppError(
      "SKILL_CONFLICT",
      "The skill changed on disk. Refresh before saving again.",
      409,
    );
  }

  const next = Buffer.from(
    updateSkillFrontmatter(original.toString("utf8"), disabled),
    "utf8",
  );
  if (original.equals(next)) return;

  const temporaryPath = path.join(
    path.dirname(realFilePath),
    `.${path.basename(realFilePath)}.${randomUUID()}.tmp`,
  );
  try {
    await fs.writeFile(temporaryPath, next, { mode: stat.mode });
    const latest = await fs.readFile(realFilePath);
    if (versionForContent(latest) !== originalVersion) {
      throw new AppError(
        "SKILL_CONFLICT",
        "The skill changed while it was being saved.",
        409,
      );
    }
    await fs.rename(temporaryPath, realFilePath);
  } finally {
    await fs.rm(temporaryPath, { force: true });
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
  const values =
    payload && typeof payload === "object"
      ? (payload as { skills?: unknown; results?: unknown }).skills ??
        (payload as { results?: unknown }).results
      : undefined;
  if (!Array.isArray(values)) return [];
  return values.flatMap(mapApiSkill).slice(0, limit);
}

export function mapApiSkill(value: unknown): SkillSearchResult[] {
  if (!value || typeof value !== "object") return [];
  const item = value as Record<string, unknown>;
  const name =
    stringValue(item.name) ||
    stringValue(item.skillName) ||
    stringValue(item.slug);
  const source =
    stringValue(item.source) ||
    stringValue(item.repository) ||
    stringValue(item.repo);
  if (!name || !source) return [];
  const packageSpec =
    stringValue(item.package) ||
    stringValue(item.installRef) ||
    `${source}@${name}`;
  return [
    {
      id: packageSpec,
      name,
      description: stringValue(item.description),
      source,
      packageSpec,
      installs: numberValue(item.installs) ?? numberValue(item.installCount),
      url: stringValue(item.url) || undefined,
    },
  ];
}

export function parseCliSearch(
  output: string,
  limit: number,
): SkillSearchResult[] {
  const results: SkillSearchResult[] = [];
  const seen = new Set<string>();
  for (const line of cleanAnsi(output).split(/\r?\n/)) {
    const match = line.trim().match(/^([^\s]+\/[^\s]+)@([^\s]+)(?:\s|$)/);
    if (!match) continue;
    const packageSpec = `${match[1]}@${match[2]}`;
    if (seen.has(packageSpec)) continue;
    seen.add(packageSpec);
    results.push({
      id: packageSpec,
      name: match[2],
      description: "",
      source: match[1],
      packageSpec,
    });
    if (results.length >= limit) break;
  }
  return results;
}

export function updateSkillFrontmatter(
  content: string,
  disabled: boolean,
): string {
  const hasBom = content.startsWith("\uFEFF");
  const body = hasBom ? content.slice(1) : content;
  const bom = hasBom ? "\uFEFF" : "";
  const newline = body.includes("\r\n") ? "\r\n" : "\n";
  const match = body.match(/^---(?:\r?\n)([\s\S]*?)(?:\r?\n)---(?=\r?\n|$)/);
  if (!match) {
    return disabled
      ? `${bom}---${newline}disable-model-invocation: true${newline}---${newline}${body}`
      : content;
  }

  const lines = match[1].split(/\r?\n/);
  const keyPattern =
    /^(\s*)disable-model-invocation\s*:\s*([^#]*?)(\s*(?:#.*)?)$/;
  const index = lines.findIndex((line) => keyPattern.test(line));
  if (disabled) {
    if (index >= 0) {
      lines[index] = lines[index].replace(
        keyPattern,
        "$1disable-model-invocation: true$3",
      );
    } else {
      lines.push("disable-model-invocation: true");
    }
  } else if (index >= 0) {
    lines.splice(index, 1);
  }

  const replacement = `---${newline}${lines.join(newline)}${newline}---`;
  return `${bom}${body.replace(match[0], replacement)}`;
}

export function displaySkillPath(
  filePath: string,
  cwd: string,
  homeDir: string,
): string {
  const flavor =
    /^[A-Za-z]:[\\/]/.test(filePath) ? path.win32 : path.posix;
  const relative = flavor.relative(cwd, filePath);
  if (
    relative === "" ||
    (!relative.startsWith("..") && !flavor.isAbsolute(relative))
  ) {
    return relative || flavor.basename(filePath);
  }
  const homeRelative = flavor.relative(homeDir, filePath);
  if (
    homeRelative === "" ||
    (!homeRelative.startsWith("..") && !flavor.isAbsolute(homeRelative))
  ) {
    return `~${flavor.sep}${homeRelative}`;
  }
  return filePath;
}

function cleanAnsi(value: string): string {
  return value.replace(ANSI_PATTERN, "");
}

function skillIdForPath(filePath: string): string {
  return createHash("sha256").update(filePath).digest("hex").slice(0, 24);
}

function versionForContent(content: Uint8Array): string {
  return createHash("sha256").update(content).digest("hex");
}

function samePath(left: string, right: string): boolean {
  return process.platform === "win32"
    ? left.toLocaleLowerCase() === right.toLocaleLowerCase()
    : left === right;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

export function validatePackageSpec(packageSpec: string): void {
  if (
    packageSpec.length > 300 ||
    !packageSpec.includes("/") ||
    packageSpec.startsWith("-") ||
    packageSpec.includes("..") ||
    !/^[A-Za-z0-9@._/-]+$/.test(packageSpec)
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "package must be a valid skills package reference",
      400,
    );
  }
}

export function buildInstallArgs(
  npxCli: string,
  input: InstallSkillInput,
): string[] {
  const args = [
    npxCli,
    "--yes",
    "skills",
    "add",
    input.packageSpec,
    "-y",
    "--agent",
    "pi",
  ];
  if (input.scope === "global") args.push("-g");
  return args;
}

export function buildRemoveArgs(
  npxCli: string,
  skillName: string,
  scope: "project" | "global",
): string[] {
  const args = [
    npxCli,
    "--yes",
    "skills",
    "remove",
    skillName,
    "-y",
    "--agent",
    "pi",
  ];
  if (scope === "global") args.push("-g");
  return args;
}

async function resolveNpxCli(): Promise<string> {
  const npmExecPath = process.env.npm_execpath;
  const candidates = [
    npmExecPath
      ? path.join(path.dirname(npmExecPath), "npx-cli.js")
      : undefined,
    path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npx-cli.js"),
    path.resolve(
      path.dirname(process.execPath),
      "..",
      "lib",
      "node_modules",
      "npm",
      "bin",
      "npx-cli.js",
    ),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try the next npm installation layout.
    }
  }
  throw new Error("Unable to locate npm's npx-cli.js");
}
