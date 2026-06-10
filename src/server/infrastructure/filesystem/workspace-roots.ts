import path from "node:path";
import type { WorkspaceRootProvider } from "@/server/ports/file-system";

export class InMemoryWorkspaceRoots implements WorkspaceRootProvider {
  private readonly roots = new Set<string>();

  constructor(initialRoots: string[] = [process.cwd()]) {
    initialRoots.forEach((root) => this.addRoot(root));
  }

  async listRoots(): Promise<string[]> {
    return [...this.roots];
  }

  addRoot(value: string): void {
    this.roots.add(path.resolve(value));
  }
}

