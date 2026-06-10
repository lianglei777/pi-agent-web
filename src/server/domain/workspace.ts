export interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  modified: string;
}

export interface ByteRange {
  start: number;
  end: number;
}

export interface BinaryFile {
  path: string;
  size: number;
  contentType: string;
  createStream(range?: ByteRange): ReadableStream<Uint8Array>;
}

export interface FileChangeEvent {
  type: "change" | "rename";
  path: string;
}

