// shared/lib/archive/strategies/importStrategy.ts
import type { IArchiveReader, ImportContext } from '../types';
import { db } from '@shared/api/storage/indexedDB/schema';

export interface IImportStrategy {
  type: string;
  priority: number;
  canHandle(node: any): boolean;
  restoreFiles(node: any, reader: IArchiveReader, context: ImportContext): Promise<any>;
  restoreNode(node: any, restoredFiles: Map<string, any>, context: ImportContext): Promise<any>;
}

// Стратегия импорта для изображений
export class ImageImportStrategy implements IImportStrategy {
  type = 'image';
  priority = 10;

  canHandle(node: any): boolean {
    return node.type === 'image';
  }

  async restoreFiles(
    node: any, 
    reader: IArchiveReader, 
    context: ImportContext
  ): Promise<any> {
    const imagePath = `assets/images/${node.id}_${node.fileName}`;
    const imageEntry = reader.getFile(imagePath);
    
    if (imageEntry) {
      const blob = await imageEntry.getBlob();
      const file = new File([blob], node.fileName, { type: node.mimeType });
      
      // Сохраняем в базу данных
      await db.saveFile(file, context.projectId, node.fileName, node.id);
      
      return {
        fileId: node.id,
        fileName: node.fileName,
        blob,
      };
    }
    
    return null;
  }

  async restoreNode(
    node: any, 
    restoredFiles: Map<string, any>, 
    context: ImportContext
  ): Promise<any> {
    const restoredFile = restoredFiles.get(node.id);
    
    return {
      ...node,
      filePath: `/images/projects/${context.projectId}/${node.fileName}`,
      projectId: context.projectId,
      updatedAt: new Date().toISOString(),
    };
  }
}

// Стратегия импорта для файлов (с поддержкой чанков)
export class FileImportStrategy implements IImportStrategy {
  type = 'file';
  priority = 8;

  canHandle(node: any): boolean {
    return node.type === 'file';
  }

  async restoreFiles(
    node: any, 
    reader: IArchiveReader, 
    context: ImportContext
  ): Promise<any> {
    if (node.chunked) {
      // Восстанавливаем из чанков
      const chunks: Blob[] = [];
      
      for (let i = 0; i < node.totalChunks; i++) {
        const chunkPath = `assets/files/${node.id}/chunk_${String(i).padStart(6, '0')}`;
        const chunkEntry = reader.getFile(chunkPath);
        
        if (chunkEntry) {
          const chunkBlob = await chunkEntry.getBlob();
          chunks.push(chunkBlob);
        }
      }
      
      if (chunks.length > 0) {
        const fullBlob = new Blob(chunks, { type: node.mimeType });
        const file = new File([fullBlob], node.fileName, { type: node.mimeType });
        
        await db.saveFile(file, context.projectId, node.fileName, node.id);
        
        return {
          fileId: node.id,
          fileName: node.fileName,
          blob: fullBlob,
          chunked: true,
        };
      }
    } else {
      // Обычный файл
      const filePath = `assets/files/${node.id}_${node.fileName}`;
      const fileEntry = reader.getFile(filePath);
      
      if (fileEntry) {
        const blob = await fileEntry.getBlob();
        const file = new File([blob], node.fileName, { type: node.mimeType });
        
        await db.saveFile(file, context.projectId, node.fileName, node.id);
        
        return {
          fileId: node.id,
          fileName: node.fileName,
          blob,
        };
      }
    }
    
    return null;
  }

  async restoreNode(
    node: any, 
    restoredFiles: Map<string, any>, 
    context: ImportContext
  ): Promise<any> {
    const restoredFile = restoredFiles.get(node.id);
    
    return {
      ...node,
      projectId: context.projectId,
      updatedAt: new Date().toISOString(),
      size: restoredFile?.blob?.size || node.fileSize,
    };
  }
}

// Стратегия импорта для видео
export class VideoImportStrategy implements IImportStrategy {
  type = 'video';
  priority = 9;

  canHandle(node: any): boolean {
    return node.type === 'video';
  }

  async restoreFiles(
    node: any, 
    reader: IArchiveReader, 
    context: ImportContext
  ): Promise<any> {
    const videoPath = `assets/videos/${node.id}_${node.fileName}`;
    const videoEntry = reader.getFile(videoPath);
    
    if (videoEntry) {
      const blob = await videoEntry.getBlob();
      const file = new File([blob], node.fileName, { type: node.mimeType });
      
      await db.saveFile(file, context.projectId, node.fileName, node.id);
      
      // Восстанавливаем превью если есть
      if (node.thumbnail) {
        const thumbPath = `assets/thumbnails/${node.id}_thumb.jpg`;
        const thumbEntry = reader.getFile(thumbPath);
        
        if (thumbEntry) {
          const thumbBlob = await thumbEntry.getBlob();
          // Сохраняем превью
          await db.saveThumbnail(node.id, thumbBlob);
        }
      }
      
      return {
        fileId: node.id,
        fileName: node.fileName,
        blob,
      };
    }
    
    return null;
  }

  async restoreNode(
    node: any, 
    restoredFiles: Map<string, any>, 
    context: ImportContext
  ): Promise<any> {
    return {
      ...node,
      projectId: context.projectId,
      updatedAt: new Date().toISOString(),
    };
  }
}