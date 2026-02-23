// src/shared/lib/dom/fileService.ts
export interface SavedFileInfo {
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  originalName: string;
  width: number;
  height: number;
}

export class FileService {
  /**
   * Сохранить изображение в IndexedDB
   */
  static async saveImage(file: File, projectId: string): Promise<SavedFileInfo> {
    console.log('📁 FileService.saveImage:', { file: file.name, projectId });
    
    try {
      // 1. Генерируем имя файла
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const extension = file.name.split('.').pop() || 'jpg';
      const fileName = `image-${timestamp}-${random}.${extension}`;
      const filePath = `/images/projects/${projectId}/${fileName}`;
      
      // 2. Получаем размеры изображения
      const dimensions = await this.getImageDimensions(file);
      
      // 3. Сохраняем файл в IndexedDB (постоянное хранилище)
      await this.saveFileToIndexedDB(file, projectId, fileName);
      
      console.log('✅ Файл сохранен в IndexedDB:', filePath);
      
      return {
        fileName,
        filePath,
        fileSize: file.size,
        mimeType: file.type,
        originalName: file.name,
        width: dimensions.width,
        height: dimensions.height,
      };
    } catch (error) {
      console.error('❌ Ошибка сохранения файла:', error);
      throw error;
    }
  }


  // src/shared/lib/dom/fileService.ts (фрагмент)
  private static async saveFileToIndexedDB(file: File, projectId: string, fileName: string): Promise<void> {
    const { db } = await import('@shared/api/storage/indexedDB/schema');
    
    const id = `${projectId}_${fileName}`;
    const now = new Date().toISOString();
    
    // Проверяем, существует ли уже файл
    const existing = await db.fileStorage.get(id);
    if (existing) {
      console.log(`⚠️ Файл уже существует, обновляем: ${fileName}`);
    }
    
    await db.fileStorage.put({
      id,
      projectId,
      fileName,
      blob: file,
      mimeType: file.type,
      size: file.size,
      createdAt: existing ? existing.createdAt : now,
      lastAccessed: now,
    });
    
    // ✅ Важно: проверяем, что файл действительно сохранился
    const saved = await db.fileStorage.get(id);
    if (saved) {
      console.log(`✅ Файл успешно сохранен в IndexedDB: ${fileName} (${(saved.size / 1024).toFixed(1)} KB)`);
    } else {
      console.error(`❌ Файл НЕ сохранился в IndexedDB: ${fileName}`);
    }
  }
  /**
   * Получить файл из IndexedDB
   */
  static async getFile(projectId: string, fileName: string): Promise<File | null> {
    const { db } = await import('@shared/api/storage/indexedDB/schema');
    
    const id = `${projectId}_${fileName}`;
    const stored = await db.fileStorage.get(id);
    
    if (!stored) {
      console.warn(`⚠️ Файл не найден в IndexedDB: ${projectId}/${fileName}`);
      return null;
    }
    
    // Обновляем время последнего доступа
    await db.fileStorage.update(id, { lastAccessed: new Date().toISOString() });
    
    return new File([stored.blob], stored.fileName, { type: stored.mimeType });
  }

  /**
   * Получить URL для отображения изображения
   */
  static async getFileUrl(projectId: string, fileName: string): Promise<string | null> {
    try {
      const file = await this.getFile(projectId, fileName);
      if (!file) {
        console.warn(`⚠️ Не удалось получить файл: ${projectId}/${fileName}`);
        return null;
      }
      
      // Создаем blob URL для отображения
      const url = URL.createObjectURL(file);
      console.log(`🔗 Создан blob URL для: ${fileName}`);
      return url;
    } catch (error) {
      console.error('❌ Ошибка получения URL:', error);
      return null;
    }
  }

  /**
   * Удалить файл
   */
  static async deleteFile(projectId: string, fileName: string): Promise<boolean> {
    const { db } = await import('@shared/api/storage/indexedDB/schema');
    
    const id = `${projectId}_${fileName}`;
    
    try {
      await db.fileStorage.delete(id);
      console.log(`🗑️ Файл удален из IndexedDB: ${fileName}`);
      return true;
    } catch (error) {
      console.error('❌ Ошибка удаления файла:', error);
      return false;
    }
  }

  /**
   * Получение размеров изображения
   */
  static async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({
          width: img.width,
          height: img.height,
        });
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Не удалось загрузить изображение'));
      };
      
      img.src = url;
    });
  }

  /**
   * Освободить blob URL
   */
  static revokeUrl(url: string): void {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
      console.log('🧹 blob URL освобожден');
    }
  }

  /**
   * Получить информацию о файле
   */
  static async getFileInfo(projectId: string, fileName: string): Promise<{
    exists: boolean;
    size?: number;
    mimeType?: string;
    createdAt?: string;
  }> {
    const { db } = await import('@shared/api/storage/indexedDB/schema');
    
    const id = `${projectId}_${fileName}`;
    const stored = await db.fileStorage.get(id);
    
    if (!stored) {
      return { exists: false };
    }
    
    return {
      exists: true,
      size: stored.size,
      mimeType: stored.mimeType,
      createdAt: stored.createdAt,
    };
  }
}