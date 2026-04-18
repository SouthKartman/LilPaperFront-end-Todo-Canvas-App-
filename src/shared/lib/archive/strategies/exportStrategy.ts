// shared/lib/archive/strategies/exportStrategy.ts
import type { IArchiveFile, ExportContext } from '../types';
import { db } from '@shared/api/storage/indexedDB/schema';

// Базовый интерфейс стратегии
export interface IExportStrategy {
  type: string;
  priority: number;
  canHandle(node: any): boolean;
  collectFiles(node: any, context: ExportContext): Promise<IArchiveFile[]>;
  getManifestEntry(node: any, context: ExportContext): any;
}

// Стратегия для изображений
export class ImageExportStrategy implements IExportStrategy {
  type = 'image';
  priority = 10;

  canHandle(node: any): boolean {
    return node.type === 'image' || node.mimeType?.startsWith('image/');
  }

  async collectFiles(node: any, context: ExportContext): Promise<IArchiveFile[]> {
    const files: IArchiveFile[] = [];

    try {
      // Получаем файл из хранилища
      const file = await db.getFile(context.projectId, node.fileName);
      
      if (file) {
        const archivePath = `${context.basePath}/images/${node.id}_${node.fileName}`;
        
        files.push({
          path: archivePath,
          data: file,
          metadata: {
            type: 'image',
            originalName: node.originalName || node.fileName,
            size: file.size,
            mimeType: node.mimeType,
          },
        });
      }

      // Если есть превью
      if (node.thumbnail) {
        const thumbnailPath = `${context.basePath}/thumbnails/${node.id}_thumb.jpg`;
        files.push({
          path: thumbnailPath,
          data: node.thumbnail,
          metadata: {
            type: 'image',
            originalName: `thumb_${node.fileName}`,
            size: node.thumbnail.size,
          },
        });
      }
    } catch (error) {
      console.error(`Ошибка сбора файлов для изображения ${node.id}:`, error);
    }

    return files;
  }

  getManifestEntry(node: any, context: ExportContext): any {
    return {
      id: node.id,
      type: 'image',
      fileName: node.fileName,
      originalName: node.originalName,
      filePath: node.filePath,
      position: node.position,
      size: node.size,
      mimeType: node.mimeType,
      metadata: node.metadata,
    };
  }
}

// Стратегия для обычных файлов (с поддержкой чанков)
export class FileExportStrategy implements IExportStrategy {
  type = 'file';
  priority = 8;

  canHandle(node: any): boolean {
    return node.type === 'file' || node.type === 'document';
  }

  async collectFiles(node: any, context: ExportContext): Promise<IArchiveFile[]> {
    const files: IArchiveFile[] = [];

    try {
      // Если файл с чанками
      if (node.chunked && node.totalChunks > 1) {
        for (let i = 0; i < node.totalChunks; i++) {
          const chunk = await db.getChunk(node.id, i);
          if (chunk) {
            files.push({
              path: `${context.basePath}/files/${node.id}/chunk_${String(i).padStart(6, '0')}`,
              data: chunk,
              metadata: {
                type: 'file',
                chunked: true,
                chunkIndex: i,
                totalChunks: node.totalChunks,
              },
            });
          }
        }
      } else {
        // Обычный файл
        const file = await db.getFile(context.projectId, node.fileName);
        if (file) {
          files.push({
            path: `${context.basePath}/files/${node.id}_${node.fileName}`,
            data: file,
            metadata: {
              type: 'file',
              originalName: node.originalName,
              size: file.size,
              mimeType: node.mimeType,
            },
          });
        }
      }
    } catch (error) {
      console.error(`Ошибка сбора файлов для файла ${node.id}:`, error);
    }

    return files;
  }

  getManifestEntry(node: any, context: ExportContext): any {
    return {
      id: node.id,
      type: 'file',
      fileName: node.fileName,
      originalName: node.originalName,
      fileSize: node.size,
      mimeType: node.mimeType,
      chunked: node.chunked || false,
      totalChunks: node.totalChunks || 1,
      position: node.position,
    };
  }
}

// Стратегия для видео
export class VideoExportStrategy implements IExportStrategy {
  type = 'video';
  priority = 9;

  canHandle(node: any): boolean {
    return node.type === 'video' || node.mimeType?.startsWith('video/');
  }

  async collectFiles(node: any, context: ExportContext): Promise<IArchiveFile[]> {
    const files: IArchiveFile[] = [];

    try {
      const videoFile = await db.getFile(context.projectId, node.fileName);
      
      if (videoFile) {
        files.push({
          path: `${context.basePath}/videos/${node.id}_${node.fileName}`,
          data: videoFile,
          metadata: {
            type: 'video',
            originalName: node.originalName,
            size: videoFile.size,
            duration: node.duration,
            mimeType: node.mimeType,
          },
        });
      }

      // Добавляем превью если есть
      if (node.thumbnail) {
        files.push({
          path: `${context.basePath}/thumbnails/${node.id}_thumb.jpg`,
          data: node.thumbnail,
          metadata: {
            type: 'image',
            originalName: `thumb_${node.fileName}`,
          },
        });
      }
    } catch (error) {
      console.error(`Ошибка сбора файлов для видео ${node.id}:`, error);
    }

    return files;
  }

  getManifestEntry(node: any, context: ExportContext): any {
    return {
      id: node.id,
      type: 'video',
      fileName: node.fileName,
      originalName: node.originalName,
      duration: node.duration,
      thumbnail: node.thumbnail ? true : false,
      position: node.position,
    };
  }
}

// Стратегия для аудио
export class AudioExportStrategy implements IExportStrategy {
  type = 'audio';
  priority = 9;

  canHandle(node: any): boolean {
    return node.type === 'audio' || node.mimeType?.startsWith('audio/');
  }

  async collectFiles(node: any, context: ExportContext): Promise<IArchiveFile[]> {
    const files: IArchiveFile[] = [];

    try {
      const audioFile = await db.getFile(context.projectId, node.fileName);
      
      if (audioFile) {
        files.push({
          path: `${context.basePath}/audio/${node.id}_${node.fileName}`,
          data: audioFile,
          metadata: {
            type: 'audio',
            originalName: node.originalName,
            size: audioFile.size,
            duration: node.duration,
            mimeType: node.mimeType,
          },
        });
      }
    } catch (error) {
      console.error(`Ошибка сбора файлов для аудио ${node.id}:`, error);
    }

    return files;
  }

  getManifestEntry(node: any, context: ExportContext): any {
    return {
      id: node.id,
      type: 'audio',
      fileName: node.fileName,
      originalName: node.originalName,
      duration: node.duration,
      position: node.position,
    };
  }
}