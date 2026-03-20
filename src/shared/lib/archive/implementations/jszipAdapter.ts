// shared/lib/archive/implementations/jszipAdapter.ts
import JSZip from 'jszip';
import type {
  IArchiveService,
  IArchiveWriter,
  IArchiveReader,
  IArchiveEntry,
  IArchiveFile,
  ArchiveProgressCallback,
  ArchiveProgress,
} from '../types';

// Реализация IArchiveEntry для JSZip
class JSZipArchiveEntry implements IArchiveEntry {
  constructor(
    public name: string,
    public path: string,
    public isDirectory: boolean,
    private zipEntry: JSZip.JSZipObject,
    public size?: number
  ) {}

  async getBlob(): Promise<Blob> {
    return this.zipEntry.async('blob');
  }

  async getText(): Promise<string> {
    return this.zipEntry.async('string');
  }

  async getArrayBuffer(): Promise<ArrayBuffer> {
    return this.zipEntry.async('arraybuffer');
  }
}

// Реализация IArchiveReader для JSZip
class JSZipArchiveReader implements IArchiveReader {
  public entries: Map<string, IArchiveEntry> = new Map();

  constructor(zip: JSZip) {
    // Преобразуем все файлы в Map
    Object.entries(zip.files).forEach(([path, entry]) => {
      if (!entry.dir) {
        this.entries.set(path, new JSZipArchiveEntry(
          entry.name,
          path,
          entry.dir,
          entry,
          entry._data?.uncompressedSize
        ));
      }
    });
  }

  hasFile(path: string): boolean {
    return this.entries.has(path);
  }

  getFile(path: string): IArchiveEntry | null {
    return this.entries.get(path) || null;
  }

  getFilesByPrefix(prefix: string): IArchiveEntry[] {
    const files: IArchiveEntry[] = [];
    for (const [path, entry] of this.entries) {
      if (path.startsWith(prefix)) {
        files.push(entry);
      }
    }
    return files;
  }

  async readManifest<T>(): Promise<T | null> {
    const manifestEntry = this.entries.get('project.json');
    if (!manifestEntry) return null;

    try {
      const content = await manifestEntry.getText();
      return JSON.parse(content) as T;
    } catch {
      return null;
    }
  }
}

// Реализация IArchiveWriter для JSZip
class JSZipArchiveWriter implements IArchiveWriter {
  private zip: JSZip;
  private files: IArchiveFile[] = [];
  private fileCount: number = 0;

  constructor() {
    this.zip = new JSZip();
  }

  addFile(file: IArchiveFile): void {
    this.files.push(file);
    this.zip.file(file.path, file.data);
    this.fileCount++;
  }

  addFolder(path: string): void {
    this.zip.folder(path);
  }

  addFiles(files: IArchiveFile[]): void {
    files.forEach(file => this.addFile(file));
  }

  getFileCount(): number {
    return this.fileCount;
  }

  async generate(onProgress?: ArchiveProgressCallback): Promise<Blob> {
    const totalFiles = this.fileCount;
    let processedFiles = 0;

    return this.zip.generateAsync(
      {
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      },
      (metadata) => {
        if (onProgress && metadata.currentFile) {
          processedFiles++;
          const progress: ArchiveProgress = {
            current: processedFiles,
            total: totalFiles,
            currentFile: metadata.currentFile,
            percent: (processedFiles / totalFiles) * 100,
          };
          onProgress(progress);
        }
      }
    );
  }
}

// Основной сервис
class JSZipArchiveService implements IArchiveService {
  createWriter(): IArchiveWriter {
    return new JSZipArchiveWriter();
  }

  async createReader(blob: Blob): Promise<IArchiveReader> {
    const zip = await JSZip.loadAsync(blob);
    return new JSZipArchiveReader(zip);
  }

  download(blob: Blob, filename: string): void {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// Экспортируем синглтон
export const archiveService = new JSZipArchiveService();