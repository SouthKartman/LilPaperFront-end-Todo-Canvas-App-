// shared/lib/archive/types.ts
export interface IArchiveFile {
  path: string;
  data: Blob | string | ArrayBuffer;
  metadata?: {
    type: 'image' | 'file' | 'video' | 'audio' | 'manifest';
    originalName?: string;
    size?: number;
    chunked?: boolean;
    chunkIndex?: number;
    totalChunks?: number;
    mimeType?: string;
  };
}

export interface IArchiveEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  getBlob(): Promise<Blob>;
  getText(): Promise<string>;
  getArrayBuffer(): Promise<ArrayBuffer>;
}

export interface IArchiveReader {
  entries: Map<string, IArchiveEntry>;
  hasFile(path: string): boolean;
  getFile(path: string): IArchiveEntry | null;
  getFilesByPrefix(prefix: string): IArchiveEntry[];
  readManifest<T>(): Promise<T | null>;
}

export interface IArchiveWriter {
  addFile(file: IArchiveFile): void;
  addFolder(path: string): void;
  addFiles(files: IArchiveFile[]): void;
  generate(): Promise<Blob>;
  getFileCount(): number;
}

export interface IArchiveService {
  createWriter(): IArchiveWriter;
  createReader(blob: Blob): Promise<IArchiveReader>;
  download(blob: Blob, filename: string): void;
}

export interface ArchiveProgress {
  current: number;
  total: number;
  currentFile?: string;
  percent: number;
}

export type ArchiveProgressCallback = (progress: ArchiveProgress) => void;

export interface ExportContext {
  projectId: string;
  basePath: string;
  onProgress?: ArchiveProgressCallback;
}

export interface ImportContext {
  projectId: string;
  onProgress?: ArchiveProgressCallback;
}

export interface ExportManifest {
  version: string;
  exportDate: string;
  project: {
    id: string;
    name: string;
    version?: string;
  };
  stats: {
    totalNodes: number;
    totalFiles: number;
    totalSize: number;
  };
  nodes: any[];
  files: Array<{
    originalPath: string;
    archivePath: string;
    type: string;
    size: number;
    metadata?: any;
  }>;
}