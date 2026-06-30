import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  JsonProjectRepository,
  projectPathKey,
} from "./json-project-repository";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((value) => fs.rm(value, { force: true, recursive: true })),
  );
});

describe("JsonProjectRepository", () => {
  it("persists additions and removals", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "po-projects-"));
    temporaryDirectories.push(directory);
    const repository = new JsonProjectRepository(
      path.join(directory, "projects.json"),
    );

    await repository.replace(["/work/a"]);
    await repository.add("/work/b");
    await repository.remove("/work/a");

    expect(await repository.list()).toEqual(["/work/b"]);
  });

  it("does not duplicate equivalent project paths", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "po-projects-"));
    temporaryDirectories.push(directory);
    const repository = new JsonProjectRepository(
      path.join(directory, "projects.json"),
    );

    await repository.replace(["C:\\Work\\App", "c:\\work\\app"]);

    expect(await repository.list()).toEqual(["C:\\Work\\App"]);
  });

  it("normalizes Windows comparison keys without changing Unix case", () => {
    expect(projectPathKey("C:\\Work\\App", "win32")).toBe(
      "c:\\work\\app",
    );
    expect(projectPathKey("/Work/App", "linux")).toBe("/Work/App");
  });
});
