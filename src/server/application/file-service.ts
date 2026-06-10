import path from "node:path";
import { AppError } from "@/server/domain/app-error";
import type {
  WorkspaceFileService,
  WorkspaceRootProvider,
} from "@/server/ports/file-system";

export class FileService {
  constructor(
    private readonly files: WorkspaceFileService,
    private readonly roots: WorkspaceRootProvider,
  ) {}

  async list(requestedPath: string) {
    return this.files.list(await this.resolveAllowed(requestedPath));
  }

  async readText(requestedPath: string) {
    return this.files.readText(await this.resolveAllowed(requestedPath));
  }

  async getBinary(requestedPath: string) {
    return this.files.getBinary(await this.resolveAllowed(requestedPath));
  }

  async watch(
    requestedPath: string,
    listener: Parameters<WorkspaceFileService["watch"]>[1],
  ) {
    return this.files.watch(await this.resolveAllowed(requestedPath), listener);
  }

  private async resolveAllowed(requestedPath: string): Promise<string> {
    const resolved = path.resolve(requestedPath);
    const roots = await this.roots.listRoots();
    const allowed = roots.some((root) => {
      const relative = path.relative(root, resolved);
      return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
    });
    if (!allowed) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Path is outside the configured workspace roots",
        403,
      );
    }
    return resolved;
  }
}

