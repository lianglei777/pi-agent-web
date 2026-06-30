import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { DirectoryBrowser } from "@/server/ports/directory-browser";
import type { WorkspaceRootProvider } from "@/server/ports/file-system";
import type { ProjectRepository } from "@/server/ports/project-repository";
import type { SessionRepository } from "@/server/ports/session-repository";
import { ProjectService } from "./project-service";

function setup(initialized = true) {
  let paths = initialized ? [path.resolve("project-a")] : [];
  const projects: ProjectRepository = {
    exists: vi.fn(async () => initialized),
    list: vi.fn(async () => paths),
    replace: vi.fn(async (next) => {
      paths = next;
    }),
    add: vi.fn(async (value) => {
      if (!paths.includes(value)) paths.push(value);
    }),
    remove: vi.fn(async (value) => {
      paths = paths.filter((item) => item !== value);
    }),
  };
  const directories: DirectoryBrowser = {
    home: vi.fn(() => path.resolve("home")),
    roots: vi.fn(async () => [path.parse(path.resolve("home")).root]),
    resolveDirectory: vi.fn(async (value) => path.resolve(value)),
    listDirectories: vi.fn(async () => [
      { name: "child", path: path.resolve("home/child") },
    ]),
  };
  const sessions: SessionRepository = {
    list: vi.fn(async () => [
      {
        id: "new",
        path: "new.jsonl",
        cwd: path.resolve("legacy"),
        created: "2026-01-01",
        modified: "2026-01-02",
        messageCount: 1,
        firstMessage: "new",
      },
      {
        id: "old",
        path: "old.jsonl",
        cwd: path.resolve("legacy"),
        created: "2026-01-01",
        modified: "2026-01-01",
        messageCount: 1,
        firstMessage: "old",
      },
    ]),
    findById: vi.fn(async () => null),
    getContext: vi.fn(async () => null),
    rename: vi.fn(async () => undefined),
    deleteAndReparent: vi.fn(async () => undefined),
    resolveStoragePath: vi.fn(async () => null),
  };
  const roots: WorkspaceRootProvider = {
    addRoot: vi.fn(),
    listRoots: vi.fn(async () => []),
  };
  return { directories, projects, roots, sessions };
}

describe("ProjectService", () => {
  it("seeds a missing registry from existing Session directories once", async () => {
    const input = setup(false);
    const service = new ProjectService(
      input.projects,
      input.directories,
      input.sessions,
      input.roots,
    );

    expect(await service.list()).toEqual([
      {
        path: path.resolve("legacy"),
        aliases: [path.resolve("legacy")],
      },
    ]);
    expect(input.projects.replace).toHaveBeenCalledOnce();
  });

  it("adds and registers a validated directory", async () => {
    const input = setup();
    const service = new ProjectService(
      input.projects,
      input.directories,
      input.sessions,
      input.roots,
    );

    await expect(service.add("project-b")).resolves.toEqual({
      path: path.resolve("project-b"),
      aliases: [path.resolve("project-b")],
    });
    expect(input.roots.addRoot).toHaveBeenCalledWith(
      path.resolve("project-b"),
    );
  });

  it("returns historical Session path aliases for canonical projects", async () => {
    const input = setup();
    vi.mocked(input.sessions.list).mockResolvedValue([
      {
        id: "legacy",
        path: "legacy.jsonl",
        cwd: "legacy-alias",
        created: "2026-01-01",
        modified: "2026-01-01",
        messageCount: 1,
        firstMessage: "legacy",
      },
    ]);
    vi.mocked(input.directories.resolveDirectory).mockImplementation(
      async (value) =>
        value === "legacy-alias" ? path.resolve("project-a") : path.resolve(value),
    );
    const service = new ProjectService(
      input.projects,
      input.directories,
      input.sessions,
      input.roots,
    );

    expect(await service.list()).toEqual([
      {
        path: path.resolve("project-a"),
        aliases: [path.resolve("project-a"), "legacy-alias"],
      },
    ]);
  });

  it("removes only registry state", async () => {
    const input = setup();
    const service = new ProjectService(
      input.projects,
      input.directories,
      input.sessions,
      input.roots,
    );

    await expect(service.remove(path.resolve("project-a"))).resolves.toEqual({
      success: true,
    });
    expect(input.projects.remove).toHaveBeenCalled();
    expect(input.roots.addRoot).not.toHaveBeenCalled();
  });

  it("returns server-built breadcrumbs and project shortcuts", async () => {
    const input = setup();
    const service = new ProjectService(
      input.projects,
      input.directories,
      input.sessions,
      input.roots,
    );

    const result = await service.browse(path.resolve("home/child"));

    expect(result.current).toBe(path.resolve("home/child"));
    expect(result.breadcrumbs.at(-1)).toEqual({
      name: "child",
      path: path.resolve("home/child"),
    });
    expect(result.roots).toContain(path.resolve("project-a"));
  });
});
