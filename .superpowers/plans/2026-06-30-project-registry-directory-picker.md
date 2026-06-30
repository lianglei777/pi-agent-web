# Cross-Platform Project Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent project list with non-destructive removal and replace the Sidebar path menu with a viewport-safe, cross-platform directory picker.

**Architecture:** Add project and directory-browser contracts at the domain/port boundary, implement them with Node.js standard-library adapters, and expose them through a small `ProjectService` and two thin Route Handlers. The Sidebar consumes the project registry as its source of truth; Session data is grouped underneath registered projects instead of defining the project list.

**Tech Stack:** Next.js 16 App Router · React 19 · TypeScript · Node.js `fs/path/os` · existing Radix Dialog/DropdownMenu primitives · Vitest.

---

## Required reading before implementation

- `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
- `docs/architecture.md`
- `docs/agent-api-reference.md`
- `PRODUCT.md`
- `DESIGN.md`
- `.superpowers/specs/2026-06-30-project-registry-directory-picker-design.md`

## File map

| File | Responsibility | Action |
| --- | --- | --- |
| `src/server/domain/project.ts` | Project and directory-browser contracts | Create |
| `src/server/ports/project-repository.ts` | Persistent project-list boundary | Create |
| `src/server/ports/directory-browser.ts` | Unregistered-directory browsing boundary | Create |
| `src/server/infrastructure/filesystem/node-directory-browser.ts` | Cross-platform roots, validation and directory listing | Create |
| `src/server/infrastructure/filesystem/node-directory-browser.test.ts` | Cross-platform root and directory tests | Create |
| `src/server/infrastructure/filesystem/json-project-repository.ts` | Atomic `projects.json` persistence | Create |
| `src/server/infrastructure/filesystem/json-project-repository.test.ts` | Persistence and dedupe tests | Create |
| `src/server/application/project-service.ts` | Migration, add/remove, browse and root registration | Create |
| `src/server/application/project-service.test.ts` | Use-case tests | Create |
| `src/server/composition/container.ts` | Construct project dependencies | Modify |
| `src/server/transport/http/validators.ts` | Project path validation | Modify |
| `src/server/transport/http/validators.test.ts` | Project request validation | Modify |
| `src/app/api/projects/route.ts` | List/add/remove projects | Create |
| `src/app/api/projects/browse/route.ts` | Browse directories | Create |
| `src/app/api/default-cwd/route.ts` | Obsolete service-start directory API | Delete |
| `docs/agent-api-reference.md` | Public HTTP contract | Modify |
| `src/features/session-sidebar/types.ts` | Client project/browse contracts | Modify |
| `src/features/session-sidebar/api.ts` | Project client API | Modify |
| `src/features/session-sidebar/session-utils.ts` | Group Sessions under registered projects | Modify |
| `src/features/session-sidebar/session-utils.test.ts` | Grouping regression tests | Modify |
| `src/features/session-sidebar/project-picker.tsx` | Dialog directory picker | Create |
| `src/features/session-sidebar/cwd-picker.tsx` | Obsolete fixed popover | Delete |
| `src/features/session-sidebar/session-sidebar.tsx` | Project loading, selection, removal and empty state | Modify |
| `src/i18n/dictionaries/en.ts` | English project UI copy | Modify |
| `src/i18n/dictionaries/zh.ts` | Chinese project UI copy | Modify |

---

### Task 1: Define project contracts and cross-platform directory browsing

**Files:**
- Create: `src/server/domain/project.ts`
- Create: `src/server/ports/directory-browser.ts`
- Create: `src/server/infrastructure/filesystem/node-directory-browser.ts`
- Create: `src/server/infrastructure/filesystem/node-directory-browser.test.ts`

- [ ] **Step 1: Write failing root-candidate tests**

Create `src/server/infrastructure/filesystem/node-directory-browser.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { candidateRoots } from "./node-directory-browser";

describe("candidateRoots", () => {
  it("offers every Windows drive letter for probing", () => {
    const roots = candidateRoots("win32", "C:\\Users\\me");
    expect(roots[0]).toBe("A:\\");
    expect(roots).toContain("C:\\");
    expect(roots.at(-1)).toBe("Z:\\");
  });

  it("uses the filesystem root on Linux and macOS", () => {
    expect(candidateRoots("linux", "/home/me")).toEqual(["/"]);
    expect(candidateRoots("darwin", "/Users/me")).toEqual(["/"]);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npx vitest run src/server/infrastructure/filesystem/node-directory-browser.test.ts`

Expected: FAIL because `node-directory-browser.ts` does not exist.

- [ ] **Step 3: Add domain and port contracts**

Create `src/server/domain/project.ts`:

```ts
export interface Project {
  path: string;
}

export interface ProjectDirectory {
  name: string;
  path: string;
}

export interface ProjectBrowseResult {
  current: string;
  parent: string | null;
  roots: string[];
  breadcrumbs: ProjectDirectory[];
  directories: ProjectDirectory[];
}
```

Create `src/server/ports/directory-browser.ts`:

```ts
import type { ProjectDirectory } from "@/server/domain/project";

export interface DirectoryBrowser {
  home(): string;
  roots(): Promise<string[]>;
  resolveDirectory(value: string): Promise<string>;
  listDirectories(value: string): Promise<ProjectDirectory[]>;
}
```

- [ ] **Step 4: Implement the Node adapter**

Create `src/server/infrastructure/filesystem/node-directory-browser.ts`:

```ts
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { AppError } from "@/server/domain/app-error";
import type { DirectoryBrowser } from "@/server/ports/directory-browser";

export function candidateRoots(
  platform: NodeJS.Platform,
  home: string,
): string[] {
  if (platform === "win32") {
    return Array.from({ length: 26 }, (_, index) =>
      `${String.fromCharCode(65 + index)}:\\`,
    );
  }
  return ["/"];
}

export class NodeDirectoryBrowser implements DirectoryBrowser {
  home() {
    return os.homedir();
  }

  async roots() {
    const candidates = candidateRoots(process.platform, this.home());
    const results = await Promise.all(
      candidates.map(async (candidate) =>
        (await isDirectory(candidate)) ? candidate : null,
      ),
    );
    return results.filter((value): value is string => value !== null);
  }

  async resolveDirectory(value: string) {
    if (!path.isAbsolute(value)) {
      throw new AppError("VALIDATION_ERROR", "path must be absolute", 400);
    }
    try {
      const resolved = await fs.realpath(value);
      if (!(await fs.stat(resolved)).isDirectory()) {
        throw new AppError("NOT_A_DIRECTORY", `${value} is not a directory`, 400);
      }
      return resolved;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("FILE_NOT_FOUND", `${value} was not found`, 404);
    }
  }

  async listDirectories(value: string) {
    const resolved = await this.resolveDirectory(value);
    const entries = await fs.readdir(resolved, { withFileTypes: true });
    const directories = await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(resolved, entry.name);
        if (entry.isDirectory()) return { name: entry.name, path: entryPath };
        if (!entry.isSymbolicLink() || !(await isDirectory(entryPath))) return null;
        return { name: entry.name, path: await fs.realpath(entryPath) };
      }),
    );
    return directories
      .filter((entry): entry is { name: string; path: string } => entry !== null)
      .sort((left, right) => left.name.localeCompare(right.name));
  }
}

async function isDirectory(value: string) {
  try {
    return (await fs.stat(value)).isDirectory();
  } catch {
    return false;
  }
}
```

- [ ] **Step 5: Run focused tests and typecheck**

Run: `npx vitest run src/server/infrastructure/filesystem/node-directory-browser.test.ts && npm run typecheck`

Expected: 2 tests pass; TypeScript exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/server/domain/project.ts src/server/ports/directory-browser.ts src/server/infrastructure/filesystem/node-directory-browser.ts src/server/infrastructure/filesystem/node-directory-browser.test.ts
git commit -m "feat(projects): add cross-platform directory browser"
```

---

### Task 2: Persist the explicit project registry

**Files:**
- Create: `src/server/ports/project-repository.ts`
- Create: `src/server/infrastructure/filesystem/json-project-repository.ts`
- Create: `src/server/infrastructure/filesystem/json-project-repository.test.ts`

- [ ] **Step 1: Write failing persistence tests**

Create `src/server/infrastructure/filesystem/json-project-repository.test.ts`:

```ts
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  JsonProjectRepository,
  projectPathKey,
} from "./json-project-repository";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(directories.splice(0).map((value) => fs.rm(value, { recursive: true, force: true })));
});

describe("JsonProjectRepository", () => {
  it("persists additions and removals", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "po-projects-"));
    directories.push(directory);
    const repository = new JsonProjectRepository(path.join(directory, "projects.json"));

    await repository.replace(["/work/a"]);
    await repository.add("/work/b");
    await repository.remove("/work/a");

    expect(await repository.list()).toEqual(["/work/b"]);
  });

  it("normalizes Windows comparison keys without changing Unix case", () => {
    expect(projectPathKey("C:\\Work\\App", "win32")).toBe("c:\\work\\app");
    expect(projectPathKey("/Work/App", "linux")).toBe("/Work/App");
  });
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npx vitest run src/server/infrastructure/filesystem/json-project-repository.test.ts`

Expected: FAIL because the repository does not exist.

- [ ] **Step 3: Add the repository port**

Create `src/server/ports/project-repository.ts`:

```ts
export interface ProjectRepository {
  exists(): Promise<boolean>;
  list(): Promise<string[]>;
  replace(paths: string[]): Promise<void>;
  add(path: string): Promise<void>;
  remove(path: string): Promise<void>;
}
```

- [ ] **Step 4: Implement atomic JSON storage**

Create `src/server/infrastructure/filesystem/json-project-repository.ts`:

```ts
import { promises as fs } from "node:fs";
import path from "node:path";
import type { ProjectRepository } from "@/server/ports/project-repository";

type StoredProjects = { version: 1; projects: string[] };

export function projectPathKey(
  value: string,
  platform: NodeJS.Platform = process.platform,
) {
  const normalized = path.normalize(value);
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
    const parsed = JSON.parse(await fs.readFile(this.filePath, "utf8")) as StoredProjects;
    return Array.isArray(parsed.projects)
      ? parsed.projects.filter((value): value is string => typeof value === "string")
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
    await fs.writeFile(
      temporary,
      `${JSON.stringify({ version: 1, projects } satisfies StoredProjects, null, 2)}\n`,
    );
    await fs.rename(temporary, this.filePath);
  }

  async add(projectPath: string) {
    await this.replace([...(await this.list()), projectPath]);
  }

  async remove(projectPath: string) {
    const key = projectPathKey(projectPath);
    await this.replace((await this.list()).filter((value) => projectPathKey(value) !== key));
  }
}
```

- [ ] **Step 5: Run focused tests**

Run: `npx vitest run src/server/infrastructure/filesystem/json-project-repository.test.ts`

Expected: 2 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/server/ports/project-repository.ts src/server/infrastructure/filesystem/json-project-repository.ts src/server/infrastructure/filesystem/json-project-repository.test.ts
git commit -m "feat(projects): persist project registry"
```

---

### Task 3: Add the project application service and migration

**Files:**
- Create: `src/server/application/project-service.ts`
- Create: `src/server/application/project-service.test.ts`

- [ ] **Step 1: Write failing service tests**

Create `src/server/application/project-service.test.ts` with in-memory fakes:

```ts
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { ProjectService } from "./project-service";

function setup(initialized = true) {
  let paths = initialized ? [path.resolve("project-a")] : [];
  const repository = {
    exists: vi.fn(async () => initialized),
    list: vi.fn(async () => paths),
    replace: vi.fn(async (next: string[]) => { paths = next; }),
    add: vi.fn(async (value: string) => { if (!paths.includes(value)) paths.push(value); }),
    remove: vi.fn(async (value: string) => { paths = paths.filter((item) => item !== value); }),
  };
  const directories = {
    home: vi.fn(() => path.resolve("home")),
    roots: vi.fn(async () => [path.parse(path.resolve("home")).root]),
    resolveDirectory: vi.fn(async (value: string) => path.resolve(value)),
    listDirectories: vi.fn(async () => [{ name: "child", path: path.resolve("home/child") }]),
  };
  const sessions = { list: vi.fn(async () => [
    { cwd: path.resolve("legacy"), modified: "2026-01-02" },
    { cwd: path.resolve("legacy"), modified: "2026-01-01" },
  ]) };
  const roots = { addRoot: vi.fn(), listRoots: vi.fn(async () => []) };
  return { repository, directories, sessions, roots };
}

describe("ProjectService", () => {
  it("seeds a missing registry from existing Session directories once", async () => {
    const input = setup(false);
    const service = new ProjectService(input.repository, input.directories, input.sessions as never, input.roots);
    expect(await service.list()).toEqual([{ path: path.resolve("legacy") }]);
    expect(input.repository.replace).toHaveBeenCalledOnce();
  });

  it("adds and registers a validated directory", async () => {
    const input = setup();
    const service = new ProjectService(input.repository, input.directories, input.sessions as never, input.roots);
    const project = await service.add("project-b");
    expect(project).toEqual({ path: path.resolve("project-b") });
    expect(input.roots.addRoot).toHaveBeenCalledWith(path.resolve("project-b"));
  });

  it("removes only registry state", async () => {
    const input = setup();
    const service = new ProjectService(input.repository, input.directories, input.sessions as never, input.roots);
    await service.remove(path.resolve("project-a"));
    expect(input.repository.remove).toHaveBeenCalled();
    expect(input.roots.addRoot).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npx vitest run src/server/application/project-service.test.ts`

Expected: FAIL because `ProjectService` is missing.

- [ ] **Step 3: Implement the service**

Create `src/server/application/project-service.ts`:

```ts
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
    return projects.map((value) => ({ path: value }));
  }

  async add(value: string) {
    const resolved = await this.directories.resolveDirectory(value);
    await this.projects.add(resolved);
    this.roots.addRoot(resolved);
    return { path: resolved };
  }

  async remove(value: string) {
    await this.projects.remove(path.resolve(value));
    return { success: true as const };
  }

  async browse(value?: string): Promise<ProjectBrowseResult> {
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
      if (!previous || session.modified > previous) latest.set(session.cwd, session.modified);
    }
    const migrated: string[] = [];
    for (const [value] of [...latest].sort((left, right) => right[1].localeCompare(left[1]))) {
      try {
        migrated.push(await this.directories.resolveDirectory(value));
      } catch {
        // 已失效的历史目录不阻止项目注册表初始化。
      }
    }
    await this.projects.replace(migrated);
  }
}
```

- [ ] **Step 4: Run service tests and typecheck**

Run: `npx vitest run src/server/application/project-service.test.ts && npm run typecheck`

Expected: 3 tests pass; TypeScript exits 0. Adjust fake `SessionInfo` fields to the real interface rather than using `any` if TypeScript reports missing fields.

- [ ] **Step 5: Commit**

```bash
git add src/server/application/project-service.ts src/server/application/project-service.test.ts
git commit -m "feat(projects): add project management service"
```

---

### Task 4: Expose project APIs and synchronize public documentation

**Files:**
- Modify: `src/server/composition/container.ts`
- Modify: `src/server/transport/http/validators.ts`
- Modify: `src/server/transport/http/validators.test.ts`
- Create: `src/app/api/projects/route.ts`
- Create: `src/app/api/projects/browse/route.ts`
- Modify: `docs/agent-api-reference.md`

- [ ] **Step 1: Add failing validator tests**

Append to `src/server/transport/http/validators.test.ts` and import `parseProjectPath`:

```ts
it("validates project path bodies", () => {
  expect(parseProjectPath({ path: " /work/app " })).toEqual({ path: "/work/app" });
  expect(() => parseProjectPath({ path: "" })).toThrow("path must be a non-empty string");
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npx vitest run src/server/transport/http/validators.test.ts`

Expected: FAIL because `parseProjectPath` is missing.

- [ ] **Step 3: Add the validator**

Add to `src/server/transport/http/validators.ts`:

```ts
export function parseProjectPath(value: unknown) {
  const object = asObject(value);
  return { path: requiredString(object, "path").trim() };
}
```

- [ ] **Step 4: Compose production dependencies**

In `src/server/composition/container.ts`, import `getAgentDir`, `path`, `ProjectService`, `NodeDirectoryBrowser`, and `JsonProjectRepository`. Construct once inside `createContainer()`:

```ts
const directoryBrowser = new NodeDirectoryBrowser();
const projectRepository = new JsonProjectRepository(
  path.join(getAgentDir(), "projects.json"),
);

return {
  // existing services
  projectService: new ProjectService(
    projectRepository,
    directoryBrowser,
    sessions,
    roots,
  ),
};
```

- [ ] **Step 5: Add thin Route Handlers**

Create `src/app/api/projects/route.ts`:

```ts
import { container } from "@/server/composition/container";
import { AppError } from "@/server/domain/app-error";
import { handleRoute, readJson } from "@/server/transport/http/api-response";
import { parseProjectPath } from "@/server/transport/http/validators";

export const runtime = "nodejs";

export function GET() {
  return handleRoute(() => container.projectService.list());
}

export function POST(request: Request) {
  return handleRoute(async () => {
    const { path } = parseProjectPath(await readJson(request));
    return container.projectService.add(path);
  });
}

export function DELETE(request: Request) {
  return handleRoute(() => {
    const value = new URL(request.url).searchParams.get("path")?.trim();
    if (!value) throw new AppError("VALIDATION_ERROR", "path is required", 400);
    return container.projectService.remove(value);
  });
}
```

Create `src/app/api/projects/browse/route.ts`:

```ts
import { container } from "@/server/composition/container";
import { handleRoute } from "@/server/transport/http/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const value = new URL(request.url).searchParams.get("path")?.trim();
  return handleRoute(() => container.projectService.browse(value || undefined));
}
```

- [ ] **Step 6: Update the API reference**

Add a Projects section to `docs/agent-api-reference.md` containing the four methods, request shapes, response examples, and the explicit guarantee:

```md
`DELETE /api/projects` only removes registry metadata. It never deletes the directory, project files, or Sessions.
```

- [ ] **Step 7: Run backend checks**

Run: `npx vitest run src/server/transport/http/validators.test.ts src/server/application/project-service.test.ts && npm run typecheck`

Expected: all focused tests pass; TypeScript exits 0.

- [ ] **Step 8: Commit**

```bash
git add src/server/composition/container.ts src/server/transport/http/validators.ts src/server/transport/http/validators.test.ts src/app/api/projects/route.ts src/app/api/projects/browse/route.ts docs/agent-api-reference.md
git commit -m "feat(projects): expose project registry API"
```

---

### Task 5: Make registered projects the Sidebar source of truth

**Files:**
- Modify: `src/features/session-sidebar/types.ts`
- Modify: `src/features/session-sidebar/api.ts`
- Modify: `src/features/session-sidebar/session-utils.ts`
- Modify: `src/features/session-sidebar/session-utils.test.ts`

- [ ] **Step 1: Replace Session-derived grouping tests**

In `src/features/session-sidebar/session-utils.test.ts`, replace the `groupSessionsByCwd` tests with:

```ts
import { groupSessionsByProject } from "./session-utils";

it("keeps registered projects without Sessions and filters unregistered Sessions", () => {
  const groups = groupSessionsByProject(
    [{ path: "C:\\work\\alpha" }, { path: "C:\\work\\empty" }],
    [
      session("alpha", "2026-01-03", undefined, "C:\\work\\alpha"),
      session("hidden", "2026-01-04", undefined, "C:\\work\\removed"),
    ],
  );

  expect(groups.map((group) => group.cwd)).toEqual([
    "C:\\work\\alpha",
    "C:\\work\\empty",
  ]);
  expect(groups[0]?.nodes[0]?.session.id).toBe("alpha");
  expect(groups[1]?.nodes).toEqual([]);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npx vitest run src/features/session-sidebar/session-utils.test.ts`

Expected: FAIL because `groupSessionsByProject` is missing.

- [ ] **Step 3: Add client contracts and API calls**

Append to `src/features/session-sidebar/types.ts`:

```ts
export type Project = { path: string };
export type ProjectBrowseResult = {
  current: string;
  parent: string | null;
  roots: string[];
  breadcrumbs: Array<{ name: string; path: string }>;
  directories: Array<{ name: string; path: string }>;
};
```

Replace `loadDefaultCwd` in `src/features/session-sidebar/api.ts` with:

```ts
import type { Project, ProjectBrowseResult } from "./types";

export function loadProjects() {
  return requestJson<Project[]>("/api/projects");
}

export function addProject(path: string) {
  return requestJson<Project>("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
}

export function removeProject(path: string) {
  return requestJson<{ success: true }>(`/api/projects?path=${encodeURIComponent(path)}`, {
    method: "DELETE",
  });
}

export function browseProjects(path?: string) {
  const query = path ? `?path=${encodeURIComponent(path)}` : "";
  return requestJson<ProjectBrowseResult>(`/api/projects/browse${query}`);
}
```

- [ ] **Step 4: Implement project-led grouping**

In `src/features/session-sidebar/session-utils.ts`, add `groupSessionsByProject` alongside the existing helpers. Keep `getProjectCwds`, `getRecentCwds`, and `groupSessionsByCwd` until Task 7 so this intermediate commit remains type-correct:

```ts
import type { Project, SessionInfo, SessionTreeNode } from "./types";

export function groupSessionsByProject(
  projects: Project[],
  sessions: SessionInfo[],
) {
  return projects.map((project) => ({
    cwd: project.path,
    nodes: buildSessionTree(
      sessions.filter((session) => session.cwd === project.path),
    ),
  }));
}
```

- [ ] **Step 5: Run tests and typecheck**

Run: `npx vitest run src/features/session-sidebar/session-utils.test.ts && npm run typecheck`

Expected: focused tests pass and TypeScript exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/features/session-sidebar/types.ts src/features/session-sidebar/api.ts src/features/session-sidebar/session-utils.ts src/features/session-sidebar/session-utils.test.ts
git commit -m "refactor(projects): group sessions by registered project"
```

---

### Task 6: Replace the fixed popover with a directory picker Dialog

**Files:**
- Create: `src/features/session-sidebar/project-picker.tsx`
- Delete: `src/features/session-sidebar/cwd-picker.tsx`
- Modify: `src/i18n/dictionaries/en.ts`
- Modify: `src/i18n/dictionaries/zh.ts`

- [ ] **Step 1: Add synchronized copy**

Add these keys under `sessions` in both dictionaries:

```ts
openProject: "Open project", // zh: "打开项目"
chooseThisFolder: "Choose this folder", // zh: "选择此文件夹"
parentDirectory: "Parent directory", // zh: "上级目录"
projectLocations: "Locations", // zh: "位置"
loadingDirectories: "Loading directories", // zh: "正在加载目录"
noDirectories: "No subdirectories", // zh: "没有子目录"
removeProject: "Remove from list", // zh: "从列表移除"
removeProjectDescription: "Files and sessions will not be deleted.", // zh: "不会删除项目文件或会话。"
removeProjectFailed: "Unable to remove project", // zh: "无法移除项目"
noProjects: "No projects opened", // zh: "尚未打开项目"
```

Remove obsolete `customProjectPath`, `absolutePath`, `useDefaultDirectory`, and `customPath` keys.

- [ ] **Step 2: Create the picker component**

Create `src/features/session-sidebar/project-picker.tsx`. Use existing `Dialog`, `Button`, `ScrollArea`, `Skeleton`, and `Folder`/`ChevronRight` icons. Its public contract is:

```ts
export function ProjectPicker({
  onSelect,
  trigger = "icon",
}: {
  onSelect: (cwd: string) => void;
  trigger?: "icon" | "button";
})
```

Implement these exact state transitions:

```tsx
const [open, setOpen] = useState(false);
const [result, setResult] = useState<ProjectBrowseResult | null>(null);
const [loading, setLoading] = useState(false);
const [saving, setSaving] = useState(false);
const [error, setError] = useState("");

const navigate = useCallback(async (path?: string) => {
  setLoading(true);
  try {
    setResult(await browseProjects(path));
    setError("");
  } catch (cause) {
    setError(cause instanceof Error ? cause.message : t.sessions.unableToLoadDirectory);
  } finally {
    setLoading(false);
  }
}, [t.sessions.unableToLoadDirectory]);

useEffect(() => {
  if (open && !result) void navigate();
}, [navigate, open, result]);

async function selectCurrent() {
  if (!result || saving) return;
  setSaving(true);
  try {
    const project = await addProject(result.current);
    onSelect(project.path);
    setOpen(false);
    setError("");
  } catch (cause) {
    setError(cause instanceof Error ? cause.message : t.sessions.unableToLoadDirectory);
  } finally {
    setSaving(false);
  }
}
```

The Dialog body must render:

```tsx
<DialogContent closeLabel={t.common.close} className="max-w-xl">
  <DialogHeader>
    <DialogTitle>{t.sessions.openProject}</DialogTitle>
    <DialogDescription className="truncate font-ui-mono text-xs">
      {result?.current ?? t.sessions.loadingDirectories}
    </DialogDescription>
  </DialogHeader>

  <div className="flex flex-wrap gap-1">
    {result?.roots.map((root) => (
      <Button key={root} onClick={() => void navigate(root)} size="sm" variant="outline">
        {root}
      </Button>
    ))}
  </div>

  <ScrollArea className="h-[min(55vh,28rem)] rounded-md border border-line-subtle">
    <div className="p-1">
      <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
        {result?.breadcrumbs.map((crumb) => (
          <Button key={crumb.path} onClick={() => void navigate(crumb.path)} size="sm" variant="ghost">
            {crumb.name}
          </Button>
        ))}
      </div>
      {result?.parent ? (
        <Button className="w-full justify-start" onClick={() => void navigate(result.parent!)} variant="ghost">
          {t.sessions.parentDirectory}
        </Button>
      ) : null}
      {result?.directories.map((directory) => (
        <Button
          className="w-full justify-start font-ui-mono text-xs"
          key={directory.path}
          onClick={() => void navigate(directory.path)}
          variant="ghost"
        >
          <Folder />
          <span className="truncate">{directory.name}</span>
        </Button>
      ))}
    </div>
  </ScrollArea>

  {error ? <p className="text-xs text-destructive">{error}</p> : null}
  <DialogFooter>
    <Button onClick={() => setOpen(false)} variant="outline">{t.common.cancel}</Button>
    <Button disabled={!result || loading || saving} onClick={() => void selectCurrent()}>
      {saving ? t.common.saving : t.sessions.chooseThisFolder}
    </Button>
  </DialogFooter>
</DialogContent>
```

Use `Skeleton` rows while `loading`; show `noDirectories` when loading is false and the directory list is empty. The icon trigger keeps the existing tooltip; the button trigger renders the localized `openProject` label.

- [ ] **Step 3: Keep the old picker until Sidebar integration**

Do not edit `src/features/session-sidebar/cwd-picker.tsx` yet. Task 7 replaces its import and deletes it in the same type-safe commit.

- [ ] **Step 4: Run lint and typecheck on the new component**

Run: `npx eslint src/features/session-sidebar/project-picker.tsx src/i18n/dictionaries/en.ts src/i18n/dictionaries/zh.ts && npm run typecheck`

Expected: no lint errors. Temporary type errors in `session-sidebar.tsx` are resolved in Task 7; the new component itself must be type-correct.

- [ ] **Step 5: Commit**

```bash
git add src/features/session-sidebar/project-picker.tsx src/i18n/dictionaries/en.ts src/i18n/dictionaries/zh.ts
git commit -m "feat(projects): add directory picker dialog"
```

---

### Task 7: Integrate project loading and non-destructive removal

**Files:**
- Modify: `src/features/session-sidebar/session-sidebar.tsx`
- Modify: `src/features/session-sidebar/session-utils.ts`
- Delete: `src/features/session-sidebar/cwd-picker.tsx`
- Delete: `src/app/api/default-cwd/route.ts`

- [ ] **Step 1: Replace Session-only loading with project + Session loading**

In `session-sidebar.tsx`, import:

```ts
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { loadProjects, loadSessions, removeProject } from "./api";
import { ProjectPicker } from "./project-picker";
import { groupSessionsByProject } from "./session-utils";
import type { Project, SessionInfo } from "./types";
```

Add state:

```ts
const [projects, setProjects] = useState<Project[]>([]);
const [removingProject, setRemovingProject] = useState<string | null>(null);
```

Replace `refresh` with one request boundary:

```ts
const refresh = useCallback(async (showLoading = false) => {
  if (showLoading) setLoading(true);
  try {
    const [nextProjects, nextSessions] = await Promise.all([
      loadProjects(),
      loadSessions(),
    ]);
    setProjects(nextProjects);
    setSessions(nextSessions);
    setError("");
  } catch (cause) {
    setError(cause instanceof Error ? cause.message : t.sessions.unableToLoadSessions);
  } finally {
    if (showLoading) setLoading(false);
  }
}, [t.sessions.unableToLoadSessions]);
```

Replace `projectGroups` and `displayedGroups` with:

```ts
const displayedGroups = useMemo(
  () => groupSessionsByProject(projects, navigableSessions),
  [navigableSessions, projects],
);
```

Do not inject `selectedCwd` back into the list. This is what lets the current project remain active while hidden after removal.

- [ ] **Step 2: Keep URL restoration but remove service-directory fallback**

In the initial restore effect:

- Keep Session URL restoration unchanged.
- When there is no selected project, select `projects[0]?.path`.
- Remove `getRecentCwds`, `loadDefaultCwd`, and every call to `/api/default-cwd`.

Use:

```ts
if (!selectedCwd && projects[0]) {
  onCwdChange(projects[0].path);
}
```

Now remove `getProjectCwds`, `getRecentCwds`, and `groupSessionsByCwd` from `session-utils.ts`; all callers have moved to `groupSessionsByProject`.

- [ ] **Step 3: Add project removal**

Add:

```ts
async function removeFromList(cwd: string) {
  if (removingProject) return;
  setRemovingProject(cwd);
  try {
    await removeProject(cwd);
    setProjects((current) => current.filter((project) => project.path !== cwd));
    setError("");
  } catch (cause) {
    setError(cause instanceof Error ? cause.message : t.sessions.removeProjectFailed);
  } finally {
    setRemovingProject(null);
  }
}
```

Do not call `onCwdChange`, delete Session APIs, or filesystem APIs from this function.

- [ ] **Step 4: Render project rows without nested buttons**

Replace each project header button with a flex row:

```tsx
<div className="group flex items-center px-1">
  <Button
    aria-expanded={expanded}
    className="min-w-0 flex-1 justify-start gap-1.5 px-1 text-[11px]"
    onClick={() => selectProject(group.cwd)}
    title={group.cwd}
    variant={selected ? "secondary" : "ghost"}
  >
    <ChevronRight className={`size-3 transition-transform ${expanded ? "rotate-90" : ""}`} />
    <Folder className="size-3.5" />
    <span className="min-w-0 truncate">{getProjectName(group.cwd)}</span>
  </Button>
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        aria-label={t.sessions.removeProject}
        className="opacity-0 focus:opacity-100 group-hover:opacity-100"
        size="icon-sm"
        variant="ghost"
      >
        <MoreHorizontal />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem
        disabled={removingProject === group.cwd}
        onSelect={() => void removeFromList(group.cwd)}
      >
        <div>
          <div>{t.sessions.removeProject}</div>
          <div className="text-[10px] text-dim">{t.sessions.removeProjectDescription}</div>
        </div>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>
```

- [ ] **Step 5: Wire both picker triggers and empty state**

Header:

```tsx
<ProjectPicker
  onSelect={(cwd) => {
    void refresh().then(() => onCwdChange(cwd));
  }}
/>
```

Empty state:

```tsx
<div className="space-y-2 p-4 text-center text-[11px] text-dim">
  <p>{t.sessions.noProjects}</p>
  <ProjectPicker
    onSelect={(cwd) => {
      void refresh().then(() => onCwdChange(cwd));
    }}
    trigger="button"
  />
</div>
```

Extract a local `handleProjectSelected` callback if needed to avoid duplicating these four lines; do not create a new shared hook.

- [ ] **Step 6: Delete the obsolete endpoint**

Delete `src/features/session-sidebar/cwd-picker.tsx` and `src/app/api/default-cwd/route.ts`, then remove the default-cwd endpoint from `docs/agent-api-reference.md`.

- [ ] **Step 7: Run the full check**

Run: `npm run check`

Expected: lint, TypeScript, and all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/features/session-sidebar/session-sidebar.tsx src/features/session-sidebar/session-utils.ts src/features/session-sidebar/cwd-picker.tsx src/app/api/default-cwd/route.ts docs/agent-api-reference.md
git commit -m "feat(projects): manage registered projects in sidebar"
```

---

### Task 8: Production build and browser verification

**Files:** none unless verification reveals a defect.

- [ ] **Step 1: Run repository verification**

Run:

```bash
npm run check
npm run build
```

Expected: both commands exit 0. Record, but do not hide, the existing unrelated Turbopack NFT tracing warning if it remains.

- [ ] **Step 2: Verify migration**

With no `projects.json`, start the app and confirm existing Session cwd values appear once in the project list. Refresh twice and confirm the registry is stable and contains no duplicates.

- [ ] **Step 3: Verify cross-platform directory navigation**

On the available OS:

1. Open the picker from the Sidebar header.
2. Navigate Home, parent directories, and a platform root.
3. Confirm only directories are listed.
4. Add a project with no Sessions and confirm it remains visible.
5. Confirm a missing or unauthorized path shows an error without closing the Dialog.

For CI/unit coverage, verify Windows drive candidates and Unix `/` roots through Task 1 tests even when the current host is only one OS.

- [ ] **Step 4: Verify responsive and accessibility behavior**

At Sidebar widths 200px, 260px, and 420px:

- Dialog stays inside the viewport and is not clipped by the Sidebar.
- Header and empty-state triggers are keyboard accessible.
- Focus remains visible; Escape is intentionally blocked by the shared Dialog policy, and visible Cancel/Close controls work.
- Chinese and English copy fits without horizontal page overflow.

- [ ] **Step 5: Verify non-destructive removal**

1. Remove an inactive project: row disappears; directory and Sessions remain on disk.
2. Re-add it: previous Sessions reappear.
3. Remove the current project: current Chat stays mounted and usable; row disappears.
4. Switch away: removed project does not return after refresh.
5. Restore a removed project's Session by URL: Session opens without silently re-registering the project.

- [ ] **Step 6: Final commit only if verification required fixes**

```bash
git add <only-files-changed-by-verification>
git commit -m "fix(projects): address project picker verification"
```

Skip this commit when verification required no code changes.

---

## Plan self-review

- Spec coverage: persistent add/remove, first-run migration, active-project removal semantics, cross-platform roots, Dialog positioning, default-directory removal, security limits, i18n, API docs, tests, build and browser verification are all assigned to tasks.
- Placeholder scan: no TBD/TODO/future implementation placeholders remain.
- Type consistency: server and client use `{ path: string }`; browse responses consistently use `current`, `parent`, `roots`, and `directories`; client API names match Sidebar consumption.
- YAGNI: no project rename, sorting UI, favorites, directory mutation, native desktop bridge, path input, remote-host support, or new dependency is included.
