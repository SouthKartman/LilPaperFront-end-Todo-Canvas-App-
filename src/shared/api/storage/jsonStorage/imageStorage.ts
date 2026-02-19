import { ImageNode } from '@entities/image/model/types';
import { LocalStorage } from './localStorage';
import { FileService } from '@shared/lib/dom/fileService';

export class ImageStorage {
  private static readonly IMAGES_KEY = 'todo-app-images-v1';
  private static readonly LAST_SAVE_KEY = 'todo-app-images-last-save';

  /**
   * Сохранить изображения (только метаданные, файлы уже сохранены)
   */
  static saveImages(images: Record<string, ImageNode>): boolean {
    try {
      // Убираем лишние данные перед сохранением
      const imagesToSave = Object.values(images).reduce((acc, image) => {
        // Сохраняем только метаданные, не сами файлы
        acc[image.id] = {
          ...image,
          // Убеждаемся что filePath сохранен
          filePath: image.filePath,
        };
        return acc;
      }, {} as Record<string, ImageNode>);
      
      localStorage.setItem(this.IMAGES_KEY, JSON.stringify(imagesToSave));
      localStorage.setItem(this.LAST_SAVE_KEY, new Date().toISOString());
      
      console.log(`🖼️ Сохранено метаданных ${Object.keys(imagesToSave).length} изображений`);
      return true;
    } catch (error) {
      console.error('❌ Ошибка сохранения изображений:', error);
      return false;
    }
  }

  /**
   * Загрузить изображения
   */
  static loadImages(): Record<string, ImageNode> {
    try {
      const stored = localStorage.getItem(this.IMAGES_KEY);
      if (!stored) return {};
      
      const parsed = JSON.parse(stored);
      
      // Проверяем целостность файлов
      Object.values(parsed).forEach((image: any) => {
        if (!image.filePath) {
          console.warn('⚠️ Изображение без пути к файлу:', image.id);
        }
      });
      
      console.log(`🖼️ Загружено ${Object.keys(parsed).length} изображений`);
      return parsed;
    } catch (error) {
      console.error('❌ Ошибка загрузки изображений:', error);
      return {};
    }
  }

  /**
   * Получить статистику
   */
  static getStats() {
    const images = this.loadImages();
    const lastSave = this.getLastSave();
    
    const totalSize = Object.values(images).reduce(
      (acc, img) => acc + (img.fileSize || 0), 
      0
    );
    
    return {
      count: Object.keys(images).length,
      totalSize,
      lastSave: lastSave ? lastSave.toISOString() : null,
    };
  }

  static getLastSave(): Date | null {
    try {
      const dateStr = localStorage.getItem(this.LAST_SAVE_KEY);
      return dateStr ? new Date(dateStr) : null;
    } catch {
      return null;
    }
  }

  static clearAll(): void {
    try {
      localStorage.removeItem(this.IMAGES_KEY);
      localStorage.removeItem(this.LAST_SAVE_KEY);
      console.log('🗑️ Метаданные изображений очищены');
    } catch (error) {
      console.error('❌ Ошибка очистки изображений:', error);
    }
  }
}