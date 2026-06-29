export interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  modified: string;
}

export type OpenFile = {
  name: string;
  path: string;
};
