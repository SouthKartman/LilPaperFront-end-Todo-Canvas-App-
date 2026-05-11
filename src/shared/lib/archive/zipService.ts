// shared/lib/archive/zipService.ts
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export interface ZipFile {
  path: string;
  data: Blob | string;
}

export class ZipService {
  static async createArchive(files: ZipFile[], onProgress?: (percent: number) => void): Promise<Blob> {
    const zip = new JSZip();
    
    for (const file of files) {
      zip.file(file.path, file.data);
    }
    
    return zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    }, (metadata) => {
      if (onProgress && metadata.currentFile) {
        onProgress(metadata.percent);
      }
    });
  }
  
  static async readArchive(blob: Blob): Promise<JSZip> {
    return await JSZip.loadAsync(blob);
  }
  
  static download(blob: Blob, filename: string): void {
    saveAs(blob, filename);
  }
  
  static async getFileContent(zip: JSZip, path: string): Promise<string | null> {
    const file = zip.file(path);
    if (!file) return null;
    return await file.async('string');
  }
  
  static async getFileBlob(zip: JSZip, path: string): Promise<Blob | null> {
    const file = zip.file(path);
    if (!file) return null;
    return await file.async('blob');
  }
}