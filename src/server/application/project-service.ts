import path from "node:path";
import type { ProjectBrowseResult } from "@/server/domain/project";
import type { DirectoryBrowser } from "@/server/ports/directory-browser";
import type { WorkspaceRootProvider } from "@/server/ports/file-system";
import type { ProjectRepository } from "@/server/ports/project-repository";
import type { SessionRepository } from "@/server/ports/session-repository";

export class ProjectService {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly directories: DirectoryBrowser,
    private readonly sessions: SessionRepository,
    private readonly roots: WorkspaceRootProvider,
  ) {}

  async list() {
    await this.initialize();
    const projects = await this.projects.list();
    projects.forEach((value) => this.roots.addRoot(value));
    const aliases = new Map(
      projects.map((value) => [value, new Set([value])] as const),
    );
    const sessionPaths = [
      ...new Set((await this.sessions.list()).map((session) => session.cwd)),
    ];
    for (const sessionPath of sessionPaths) {
      try {
        const resolved = await this.directories.resolveDirectory(sessionPath);
        aliases.get(resolved)?.add(sessionPath);
      } catch {
        // 不可访问的历史目录不影响已注册项目。
      }
    }
    return projects.map((value) => ({
      path: value,
      aliases: [...(aliases.get(value) ?? [value])],
    }));
  }

  async add(value: string) {
    await this.initialize();
    const resolved = await this.directories.resolveDirectory(value);
    await this.projects.add(resolved);
    this.roots.addRoot(resolved);
    return { path: resolved, aliases: [resolved] };
  }

  async remove(value: string) {
    await this.initialize();
    await this.projects.remove(path.resolve(value));
    return { success: true as const };
  }

  async browse(value?: string): Promise<ProjectBrowseResult> {
    await this.initialize();
    const current = await this.directories.resolveDirectory(
      value ?? this.directories.home(),
    );
    const parent = path.dirname(current);
    const parsed = path.parse(current);
    const segments = current
      .slice(parsed.root.length)
      .split(path.sep)
      .filter(Boolean);
    const breadcrumbs = [
      { name: parsed.root, path: parsed.root },
      ...segments.map((name, index) => ({
        name,
        path: path.join(parsed.root, ...segments.slice(0, index + 1)),
      })),
    ];
    const roots = [
      ...(await this.directories.roots()),
      ...(await this.projects.list()),
    ].filter((root, index, all) => all.indexOf(root) === index);
    return {
      current,
      parent: parent === current ? null : parent,
      roots,
      breadcrumbs,
      directories: await this.directories.listDirectories(current),
    };
  }

  private async initialize() {
    if (await this.projects.exists()) return;
    const sessions = await this.sessions.list();
    const latest = new Map<string, string>();
    for (const session of sessions) {
      if (!session.cwd) continue;
      const previous = latest.get(session.cwd);
      if (!previous || session.modified > previous) {
        latest.set(session.cwd, session.modified);
      }
    }
    const migrated: string[] = [];
    for (const [value] of [...latest].sort((left, right) =>
      right[1].localeCompare(left[1]),
    )) {
      try {
        migrated.push(await this.directories.resolveDirectory(value));
      } catch {
        // 已失效的历史目录不阻止项目注册表初始化。
      }
    }
    await this.projects.replace(migrated);
  }
}
