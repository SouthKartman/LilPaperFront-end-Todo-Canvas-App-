// src/shared/api/storage/indexedDB/imageStorage.ts

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
   * 🆕 Получить изображение по ID
   */
  static async getImageById(imageId: string): Promise<ImageNode | null> {
    try {
      return await db.images.get(imageId) || null;
    } catch (error) {
      console.error('❌ Ошибка получения изображения:', error);
      return null;
    }
  }

  /**
   * 🆕 Добавить одно изображение
   */
  static async addImage(image: ImageNode): Promise<boolean> {
    try {
      await db.images.put({
        ...image,
        updatedAt: new Date().toISOString(),
      });
      console.log(`✅ Изображение ${image.id} сохранено в IndexedDB`);
      return true;
    } catch (error) {
      console.error('❌ Ошибка добавления изображения:', error);
      return false;
    }
  }

  /**
   * 🆕 Удалить одно изображение
   */
  static async deleteImage(imageId: string): Promise<boolean> {
    try {
      // Получаем изображение, чтобы удалить физический файл
      const image = await db.images.get(imageId);
      
      if (image?.filePath) {
        // Извлекаем projectId и fileName из пути
        const pathMatch = image.filePath.match(/\/images\/projects\/([^/]+)\/(.+)$/);
        if (pathMatch) {
          const [, projectId, fileName] = pathMatch;
          // Удаляем физический файл через FileService
          await FileService.deleteFile(projectId, fileName);
          console.log(`🗑️ Физический файл удален: ${projectId}/${fileName}`);
        }
      }
      
      // Удаляем метаданные из IndexedDB
      await db.images.delete(imageId);
      console.log(`✅ Изображение ${imageId} удалено из IndexedDB`);
      return true;
    } catch (error) {
      console.error('❌ Ошибка удаления изображения:', error);
      return false;
    }
  }

  /**
   * 🆕 Удалить несколько изображений
   */
  static async deleteImages(imageIds: string[]): Promise<boolean> {
    try {
      for (const imageId of imageIds) {
        const image = await db.images.get(imageId);
        
        if (image?.filePath) {
          const pathMatch = image.filePath.match(/\/images\/projects\/([^/]+)\/(.+)$/);
          if (pathMatch) {
            const [, projectId, fileName] = pathMatch;
            await FileService.deleteFile(projectId, fileName);
            console.log(`🗑️ Физический файл удален: ${projectId}/${fileName}`);
          }
        }
      }
      
      await db.images.bulkDelete(imageIds);
      console.log(`✅ Удалено ${imageIds.length} изображений из IndexedDB`);
      return true;
    } catch (error) {
      console.error('❌ Ошибка массового удаления изображений:', error);
      return false;
    }
  }

  /**
   * 🆕 Обновить изображение
   */
  static async updateImage(imageId: string, updates: Partial<ImageNode>): Promise<boolean> {
    try {
      await db.images.update(imageId, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      console.log(`✅ Изображение ${imageId} обновлено в IndexedDB`);
      return true;
    } catch (error) {
      console.error('❌ Ошибка обновления изображения:', error);
      return false;
    }
  }

  /**
   * 🆕 Загрузить изображения по странице
   */
  static async loadImagesByPage(pageId: string): Promise<Record<string, ImageNode>> {
    try {
      const images = await db.images.where('pageId').equals(pageId).toArray();
      return images.reduce((acc, image) => {
        acc[image.id] = image;
        return acc;
      }, {} as Record<string, ImageNode>);
    } catch (error) {
      console.error('❌ Ошибка загрузки изображений по странице:', error);
      return {};
    }
  }

  /**
   * 🆕 Загрузить изображения по проекту
   */
  static async loadImagesByProject(projectId: string): Promise<Record<string, ImageNode>> {
    try {
      const images = await db.images.where('projectId').equals(projectId).toArray();
      return images.reduce((acc, image) => {
        acc[image.id] = image;
        return acc;
      }, {} as Record<string, ImageNode>);
    } catch (error) {
      console.error('❌ Ошибка загрузки изображений по проекту:', error);
      return {};
    }
  }

  /**
   * 🆕 Удалить все изображения проекта
   */
  static async deleteProjectImages(projectId: string): Promise<boolean> {
    try {
      const images = await db.images.where('projectId').equals(projectId).toArray();
      const imageIds = images.map(img => img.id);
      
      if (imageIds.length > 0) {
        return await this.deleteImages(imageIds);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Ошибка удаления изображений проекта:', error);
      return false;
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