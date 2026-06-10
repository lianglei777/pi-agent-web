import type {
  BinaryFile,
  FileChangeEvent,
  FileEntry,
} from "@/server/domain/workspace";

export interface WorkspaceFileService {
  list(path: string): Promise<FileEntry[]>;
  readText(path: string): Promise<{
    content: string;
    language: string;
    size: number;
  }>;
  getBinary(path: string): Promise<BinaryFile>;
  watch(
    path: string,
    listener: (event: FileChangeEvent) => void,
  ): Promise<() => void>;
}

export interface WorkspaceRootProvider {
  listRoots(): Promise<string[]>;
  addRoot(path: string): void;
}

