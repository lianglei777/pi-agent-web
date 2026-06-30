import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  candidateRoots,
  NodeDirectoryBrowser,
} from "./node-directory-browser";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((value) => fs.rm(value, { force: true, recursive: true })),
  );
});

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

describe("NodeDirectoryBrowser", () => {
  it("lists directories without exposing files", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "po-browser-"));
    temporaryDirectories.push(root);
    await fs.mkdir(path.join(root, "project"));
    await fs.writeFile(path.join(root, "notes.txt"), "private");

    const browser = new NodeDirectoryBrowser();

    const resolvedRoot = await fs.realpath(root);
    expect(await browser.listDirectories(root)).toEqual([
      { name: "project", path: path.join(resolvedRoot, "project") },
    ]);
  });

  it("rejects relative paths and files", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "po-browser-"));
    temporaryDirectories.push(root);
    const file = path.join(root, "notes.txt");
    await fs.writeFile(file, "private");
    const browser = new NodeDirectoryBrowser();

    await expect(browser.resolveDirectory("relative/path")).rejects.toThrow(
      "path must be absolute",
    );
    await expect(browser.resolveDirectory(file)).rejects.toThrow(
      "is not a directory",
    );
  });
});
