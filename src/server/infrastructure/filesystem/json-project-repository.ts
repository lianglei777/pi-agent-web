import { promises as fs } from "node:fs";
import path from "node:path";
import type { ProjectRepository } from "@/server/ports/project-repository";

type StoredProjects = { version: 1; projects: string[] };

export function projectPathKey(
  value: string,
  platform: NodeJS.Platform = process.platform,
) {
  const flavor = platform === "win32" ? path.win32 : path.posix;
  const normalized = flavor.normalize(value);
  return platform === "win32" ? normalized.toLowerCase() : normalized;
}

export class JsonProjectRepository implements ProjectRepository {
  constructor(private readonly filePath: string) {}

  async exists() {
    try {
      await fs.access(this.filePath);
      return true;
    } catch {
      return false;
    }
  }

  async list() {
    if (!(await this.exists())) return [];
    const parsed = JSON.parse(
      await fs.readFile(this.filePath, "utf8"),
    ) as Partial<StoredProjects>;
    return Array.isArray(parsed.projects)
      ? parsed.projects.filter(
          (value): value is string => typeof value === "string",
        )
      : [];
  }

  async replace(paths: string[]) {
    const seen = new Set<string>();
    const projects = paths.filter((value) => {
      const key = projectPathKey(value);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.${process.pid}.tmp`;
    const stored = { version: 1, projects } satisfies StoredProjects;
    await fs.writeFile(temporary, `${JSON.stringify(stored, null, 2)}\n`);
    await fs.rename(temporary, this.filePath);
  }

  async add(projectPath: string) {
    await this.replace([...(await this.list()), projectPath]);
  }

  async remove(projectPath: string) {
    const key = projectPathKey(projectPath);
    await this.replace(
      (await this.list()).filter((value) => projectPathKey(value) !== key),
    );
  }
}
