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
  return [home.startsWith("/") ? "/" : path.parse(home).root];
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
        throw new AppError(
          "NOT_A_DIRECTORY",
          `${value} is not a directory`,
          400,
        );
      }
      return resolved;
    } catch (error) {
      if (error instanceof AppError) throw error;
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "EACCES" || code === "EPERM") {
        throw new AppError(
          "VALIDATION_ERROR",
          `${value} is not accessible`,
          403,
        );
      }
      throw new AppError("FILE_NOT_FOUND", `${value} was not found`, 404);
    }
  }

  async listDirectories(value: string) {
    const resolved = await this.resolveDirectory(value);
    let entries;
    try {
      entries = await fs.readdir(resolved, { withFileTypes: true });
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      throw new AppError(
        "VALIDATION_ERROR",
        code === "EACCES" || code === "EPERM"
          ? `${value} is not accessible`
          : `Unable to list ${value}`,
        code === "EACCES" || code === "EPERM" ? 403 : 400,
      );
    }
    const directories = await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(resolved, entry.name);
        if (entry.isDirectory()) return { name: entry.name, path: entryPath };
        if (!entry.isSymbolicLink() || !(await isDirectory(entryPath))) {
          return null;
        }
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
