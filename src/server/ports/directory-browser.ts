import type { ProjectDirectory } from "@/server/domain/project";

export interface DirectoryBrowser {
  home(): string;
  roots(): Promise<string[]>;
  resolveDirectory(value: string): Promise<string>;
  listDirectories(value: string): Promise<ProjectDirectory[]>;
}
