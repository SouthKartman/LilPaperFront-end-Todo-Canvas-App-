// src/shared/utils/diagnostic.ts
import { db } from '@shared/api/storage/indexedDB/schema';

export const imageDiagnostic = {
  async checkImage(imageId: string) {
    console.group(`🔍 Диагностика изображения: ${imageId}`);
    
    const image = await db.images.get(imageId);
    console.log('📸 Метаданные в images:', image);
    
    if (!image) {
      console.error('❌ Изображение не найдено в таблице images');
      console.groupEnd();
      return null;
    }
    
    const pathMatch = image.filePath?.match(/\/images\/projects\/([^/]+)\/(.+)$/);
    if (!pathMatch) {
      console.warn('⚠️ Неверный формат пути:', image.filePath);
      console.groupEnd();
      return image;
    }
    
    const [, projectId, fileName] = pathMatch;
    const fileId = `${projectId}_${fileName}`;
    const file = await db.fileStorage.get(fileId);
    
    console.log('📁 projectId:', projectId);
    console.log('📄 fileName:', fileName);
    console.log('💾 В fileStorage:', file ? {
      size: file.size,
      created: file.createdAt,
      mimeType: file.mimeType
    } : '❌ НЕТ');
    
    console.groupEnd();
    return { image, file, projectId, fileName };
  },

  async checkProject(projectId: string) {
    console.group(`📁 Диагностика проекта: ${projectId}`);
    
    const images = await db.images.where('projectId').equals(projectId).toArray();
    console.log(`📸 Всего изображений: ${images.length}`);
    
    let found = 0;
    let missing = 0;
    
    for (const image of images) {
      const pathMatch = image.filePath?.match(/\/images\/projects\/([^/]+)\/(.+)$/);
      if (pathMatch) {
        const [, , fileName] = pathMatch;
        const fileId = `${projectId}_${fileName}`;
        const file = await db.fileStorage.get(fileId);
        
        if (file) {
          found++;
        } else {
          missing++;
          console.warn(`⚠️ Отсутствует файл для: ${image.id} (${fileName})`);
        }
      }
    }
    
    console.log(`✅ Найдено файлов: ${found}`);
    console.log(`❌ Отсутствует: ${missing}`);
    console.groupEnd();
    
    return { total: images.length, found, missing };
  },

  async checkAll() {
    console.group('🔍 ПОЛНАЯ ДИАГНОСТИКА ХРАНИЛИЩА');
    
    const images = await db.images.toArray();
    const files = await db.fileStorage.toArray();
    
    console.log(`📸 Всего записей в images: ${images.length}`);
    console.log(`💾 Всего файлов в fileStorage: ${files.length}`);
    
    const fileIds = new Set(files.map(f => f.id));
    const missingFiles = [];
    
    for (const image of images) {
      const pathMatch = image.filePath?.match(/\/images\/projects\/([^/]+)\/(.+)$/);
      if (pathMatch) {
        const [, projectId, fileName] = pathMatch;
        const fileId = `${projectId}_${fileName}`;
        if (!fileIds.has(fileId)) {
          missingFiles.push({ id: image.id, path: image.filePath });
        }
      }
    }
    
    if (missingFiles.length > 0) {
      console.warn(`⚠️ Отсутствуют файлы для ${missingFiles.length} изображений:`, missingFiles);
    } else {
      console.log('✅ Все файлы на месте!');
    }
    
    console.groupEnd();
    
    return { imagesCount: images.length, filesCount: files.length, missingFiles };
  }
};

// Добавляем в глобальный объект
if (typeof window !== 'undefined') {
  (window as any).diag = imageDiagnostic;
}