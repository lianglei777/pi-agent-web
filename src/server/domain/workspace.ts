export type { FileChangeEvent, FileEntry } from "@/contracts/files";

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
