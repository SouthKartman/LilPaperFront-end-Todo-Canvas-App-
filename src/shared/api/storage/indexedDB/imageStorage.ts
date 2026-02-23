// src/shared/api/indexedDB/imageStorage.ts
import { db } from './schema';
import { ImageNode } from '@entities/image/model/types';
import { FileService } from '@shared/lib/dom/fileService';

export class ImageIndexedDBStorage {
  /**
   * Сохранить метаданные изображений
   */
  static async saveImages(images: Record<string, ImageNode>, projectId?: string, pageId?: string): Promise<boolean> {
    try {
      const imagesArray = Object.values(images).map(image => ({
        ...image,
        projectId: projectId || image.pageId?.split('_')[0] || 'default',
        pageId: pageId || image.pageId || 'default',
        updatedAt: new Date().toISOString(),
      }));
      
      await db.images.bulkPut(imagesArray);
      console.log(`🖼️ Сохранено ${imagesArray.length} метаданных изображений в IndexedDB`);
      return true;
    } catch (error) {
      console.error('❌ Ошибка сохранения метаданных:', error);
      return false;
    }
  }

  /**
   * Загрузить все изображения
   */
  static async loadImages(): Promise<Record<string, ImageNode>> {
    try {
      const images = await db.images.toArray();
      const imagesMap = images.reduce((acc, image) => {
        acc[image.id] = image;
        return acc;
      }, {} as Record<string, ImageNode>);
      
      console.log(`📂 Загружено ${images.length} метаданных изображений`);
      return imagesMap;
    } catch (error) {
      console.error('❌ Ошибка загрузки метаданных:', error);
      return {};
    }
  }

  /**
   * Получить URL для отображения изображения по ID
   */
  static async getImageUrl(imageId: string): Promise<string | null> {
    try {
      const image = await db.images.get(imageId);
      if (!image) {
        console.warn(`⚠️ Изображение не найдено в БД: ${imageId}`);
        return null;
      }

      // Извлекаем projectId и fileName из пути
      const pathMatch = image.filePath?.match(/\/images\/projects\/([^/]+)\/(.+)$/);
      if (!pathMatch) {
        console.warn(`⚠️ Неверный формат пути: ${image.filePath}`);
        return image.filePath || null;
      }

      const [, projectId, fileName] = pathMatch;
      
      // Получаем URL через FileService
      const url = await FileService.getFileUrl(projectId, fileName);
      
      if (!url) {
        console.warn(`⚠️ Не удалось получить файл: ${projectId}/${fileName}`);
      }
      
      return url;
    } catch (error) {
      console.error('❌ Ошибка получения URL изображения:', error);
      return null;
    }
  }

  /**
   * Миграция существующих изображений
   */
  static async migrateImages(images: Record<string, ImageNode>): Promise<void> {
    console.log('🔄 Миграция изображений в постоянное хранилище...');
    
    let successCount = 0;
    
    for (const [id, image] of Object.entries(images)) {
      try {
        // Проверяем, нужно ли мигрировать
        if (image.filePath?.startsWith('blob:') || image.filePath?.startsWith('data:')) {
          console.log(`⚠️ Пропускаем временный файл: ${image.id}`);
          continue;
        }

        // Пробуем загрузить существующий файл
        let file: File | null = null;
        
        if (image.filePath?.startsWith('http') || image.filePath?.startsWith('/')) {
          try {
            const response = await fetch(image.filePath);
            if (response.ok) {
              const blob = await response.blob();
              file = new File([blob], image.originalName, { type: image.mimeType });
            }
          } catch (e) {
            console.warn(`⚠️ Не удалось загрузить файл: ${image.filePath}`);
          }
        }

        if (file) {
          // Извлекаем projectId из pageId
          const projectId = image.pageId?.split('_')[0] || 'default';
          
          // Сохраняем через FileService
          const savedInfo = await FileService.saveImage(file, projectId);
          
          // Обновляем путь в метаданных
          await db.images.update(id, {
            filePath: savedInfo.filePath,
            fileSize: savedInfo.fileSize,
            updatedAt: new Date().toISOString(),
          });
          
          successCount++;
          console.log(`✅ Изображение ${id} мигрировано`);
        }
      } catch (error) {
        console.error(`❌ Ошибка миграции изображения ${id}:`, error);
      }
    }
    
    console.log(`✅ Мигрировано ${successCount} из ${Object.keys(images).length} изображений`);
  }
}