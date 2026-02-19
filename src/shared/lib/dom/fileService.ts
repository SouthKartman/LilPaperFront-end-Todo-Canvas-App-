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
   * Сохранить изображение в public/images
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
      
      // 3. 🔥 РЕАЛЬНОЕ СОХРАНЕНИЕ ФАЙЛА
      await this.saveFileToPublic(file, projectId, fileName);
      
      console.log('✅ Файл сохранен:', filePath);
      
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

  /**
   * Сохранить файл в public/images/projects/[projectId]/
   * В реальном приложении здесь должен быть API вызов
   */
  private static async saveFileToPublic(file: File, projectId: string, fileName: string): Promise<void> {
    // 🚨 ВРЕМЕННОЕ РЕШЕНИЕ ДЛЯ ТЕСТА
    // В реальном приложении здесь должен быть запрос к серверу
    console.log('💾 Сохраняем файл:', { projectId, fileName, size: file.size });
    
    // Создаем запись в localStorage о том, что файл "сохранен"
    // Это временное решение для тестирования
    const savedFiles = this.getSavedFiles(projectId);
    savedFiles.push({
      fileName,
      filePath: `/images/projects/${projectId}/${fileName}`,
      timestamp: Date.now(),
      dataUrl: await this.fileToDataUrl(file) // Сохраняем как dataUrl для теста
    });
    localStorage.setItem(`project-files-${projectId}`, JSON.stringify(savedFiles));
    
    // Создаем ссылку для скачивания (для теста)
    const url = URL.createObjectURL(file);
    console.log('🔗 Временный URL для файла:', url);
    
    // 👇 ВРЕМЕННО: для теста сохраняем ссылку в window
    if (!window.__tempFiles) {
      (window as any).__tempFiles = {};
    }
    (window as any).__tempFiles[`${projectId}/${fileName}`] = url;
  }

  /**
   * Конвертирует File в Data URL
   */
  private static fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Получить сохраненные файлы проекта (из localStorage)
   */
  private static getSavedFiles(projectId: string): any[] {
    const key = `project-files-${projectId}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  }

  /**
   * Получить URL файла (в реальном приложении - с сервера)
   */
  static async getFileUrl(projectId: string, fileName: string): Promise<string> {
    // 🚨 ВРЕМЕННО: возвращаем сохраненный dataUrl или создаем новый
    const savedFiles = this.getSavedFiles(projectId);
    const file = savedFiles.find(f => f.fileName === fileName);
    
    if (file?.dataUrl) {
      return file.dataUrl;
    }
    
    // Если нет в localStorage, возвращаем путь (но файла не будет)
    return `/images/projects/${projectId}/${fileName}`;
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
   * Удалить файл
   */
  static async deleteFile(projectId: string, fileName: string): Promise<boolean> {
    try {
      // Удаляем из localStorage
      const savedFiles = this.getSavedFiles(projectId);
      const filtered = savedFiles.filter(f => f.fileName !== fileName);
      localStorage.setItem(`project-files-${projectId}`, JSON.stringify(filtered));
      
      // Удаляем временную ссылку
      if ((window as any).__tempFiles?.[`${projectId}/${fileName}`]) {
        URL.revokeObjectURL((window as any).__tempFiles[`${projectId}/${fileName}`]);
        delete (window as any).__tempFiles[`${projectId}/${fileName}`];
      }
      
      return true;
    } catch (error) {
      console.error('❌ Ошибка удаления файла:', error);
      return false;
    }
  }
}

// Добавляем тип для window
declare global {
  interface Window {
    __tempFiles?: Record<string, string>;
  }
}