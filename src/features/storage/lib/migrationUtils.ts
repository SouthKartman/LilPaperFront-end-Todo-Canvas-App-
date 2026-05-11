import { db } from '@shared/api/storage/indexedDB/schema';
import { TodoStorage } from '@shared/api/storage/jsonStorage/todoStorage';
import { ImageStorage } from '@shared/api/storage/jsonStorage/imageStorage';
import { TodoIndexedDBStorage } from '@shared/api/storage/indexedDB/todoStorage';
import { ImageIndexedDBStorage } from '@shared/api/storage/indexedDB/imageStorage';
import { ProjectIndexedDBStorage } from '@shared/api/storage/indexedDB/projectStorage';

export interface MigrationProgress {
  stage: 'todos' | 'images' | 'project' | 'complete';
  progress: number;
  total: number;
  currentItem?: string;
}

export class MigrationService {
  private static instance: MigrationService;
  private progressListeners: ((progress: MigrationProgress) => void)[] = [];

  static getInstance(): MigrationService {
    if (!MigrationService.instance) {
      MigrationService.instance = new MigrationService();
    }
    return MigrationService.instance;
  }

  onProgress(callback: (progress: MigrationProgress) => void) {
    this.progressListeners.push(callback);
  }

  private emitProgress(progress: MigrationProgress) {
    this.progressListeners.forEach(listener => listener(progress));
  }

  async migrateFromLocalStorage(): Promise<boolean> {
    console.log('🔄 Начинаем миграцию из localStorage в IndexedDB...');

    try {
      // 1. Миграция задач
      this.emitProgress({ stage: 'todos', progress: 0, total: 1 });
      await this.migrateTodos();
      this.emitProgress({ stage: 'todos', progress: 1, total: 1 });

      // 2. Миграция изображений
      this.emitProgress({ stage: 'images', progress: 0, total: 1 });
      await this.migrateImages();
      this.emitProgress({ stage: 'images', progress: 1, total: 1 });

      // 3. Миграция проекта
      this.emitProgress({ stage: 'project', progress: 0, total: 1 });
      await this.migrateProject();
      this.emitProgress({ stage: 'project', progress: 1, total: 1 });

      // 4. Очистка localStorage
      this.clearLocalStorage();

      this.emitProgress({ stage: 'complete', progress: 1, total: 1 });
      console.log('✅ Миграция успешно завершена!');

      return true;
    } catch (error) {
      console.error('❌ Ошибка миграции:', error);
      return false;
    }
  }

  private async migrateTodos(): Promise<void> {
    console.log('📝 Миграция задач...');
    
    // Загружаем из localStorage
    const todos = TodoStorage.loadTodos();
    const todosCount = Object.keys(todos).length;
    
    if (todosCount > 0) {
      // Преобразуем даты из строк в ISO строки
      const processedTodos = Object.values(todos).map(todo => ({
        ...todo,
        // Убеждаемся что даты в правильном формате
        createdAt: todo.createdAt || new Date().toISOString(),
        updatedAt: todo.updatedAt || new Date().toISOString(),
        dueDate: todo.dueDate || undefined,
      }));
      
      // Сохраняем в IndexedDB
      await db.todos.bulkPut(processedTodos);
      console.log(`✅ Мигрировано ${todosCount} задач`);
    } else {
      console.log('📝 Нет задач для миграции');
    }
  }

  private async migrateImages(): Promise<void> {
    console.log('🖼️ Миграция изображений...');
    
    // Загружаем из localStorage
    const images = ImageStorage.loadImages();
    const imagesCount = Object.keys(images).length;
    
    if (imagesCount > 0) {
      // Преобразуем изображения
      const processedImages = Object.values(images).map(image => ({
        ...image,
        createdAt: image.createdAt || new Date().toISOString(),
        updatedAt: image.updatedAt || new Date().toISOString(),
      }));
      
      // Сохраняем в IndexedDB
      await db.images.bulkPut(processedImages);
      console.log(`✅ Мигрировано ${imagesCount} изображений`);
    } else {
      console.log('🖼️ Нет изображений для миграции');
    }
  }

  private async migrateProject(): Promise<void> {
    console.log('📁 Миграция проекта...');
    
    try {
      const projectStr = localStorage.getItem('project_state');
      if (!projectStr) {
        console.log('📁 Нет проекта для миграции');
        return;
      }

      const projectData = JSON.parse(projectStr);
      
      // Мигрируем проекты
      if (projectData.projects) {
        const projects = Object.values(projectData.projects).map((proj: any) => ({
          ...proj,
          createdAt: proj.metadata?.createdAt || new Date().toISOString(),
          updatedAt: proj.metadata?.updatedAt || new Date().toISOString(),
        }));
        await db.projects.bulkPut(projects);
      }

      // Мигрируем страницы
      if (projectData.pages) {
        const pages = Object.entries(projectData.pages).map(([id, page]: [string, any]) => ({
          id,
          ...page,
          projectId: projectData.currentProjectId || 'default',
          createdAt: page.metadata?.createdAt || new Date().toISOString(),
          updatedAt: page.metadata?.updatedAt || new Date().toISOString(),
        }));
        await db.pages.bulkPut(pages);
      }

      // Мигрируем полотна
      if (projectData.canvases) {
        const canvases = Object.entries(projectData.canvases).map(([id, canvas]: [string, any]) => ({
          id,
          ...canvas,
          projectId: projectData.currentProjectId || 'default',
          createdAt: canvas.metadata?.createdAt || new Date().toISOString(),
          updatedAt: canvas.metadata?.updatedAt || new Date().toISOString(),
        }));
        await db.canvases.bulkPut(canvases);
      }

      console.log('✅ Мигрирован проект');
    } catch (error) {
      console.error('❌ Ошибка миграции проекта:', error);
    }
  }

  private clearLocalStorage(): void {
    try {
      localStorage.removeItem('todo-app-nodes-v1');
      localStorage.removeItem('todo-app-images-v1');
      localStorage.removeItem('project_state');
      localStorage.removeItem('todo-app-last-save');
      localStorage.removeItem('todo-app-images-last-save');
      console.log('🗑️ localStorage очищен');
    } catch (error) {
      console.error('❌ Ошибка очистки localStorage:', error);
    }
  }

  async checkData(): Promise<{
    hasLocalStorageData: boolean;
    hasIndexedDBData: boolean;
    counts: {
      todos: number;
      images: number;
      projects: number;
      pages: number;
      canvases: number;
    };
  }> {
    const hasLocalStorageData = !!(localStorage.getItem('todo-app-nodes-v1') ||
      localStorage.getItem('todo-app-images-v1') ||
      localStorage.getItem('project_state'));

    const [todoCount, imageCount, projectCount, pageCount, canvasCount] = await Promise.all([
      db.todos.count(),
      db.images.count(),
      db.projects.count(),
      db.pages.count(),
      db.canvases.count(),
    ]);

    const hasIndexedDBData = todoCount > 0 || imageCount > 0 || projectCount > 0;

    return {
      hasLocalStorageData,
      hasIndexedDBData,
      counts: {
        todos: todoCount,
        images: imageCount,
        projects: projectCount,
        pages: pageCount,
        canvases: canvasCount,
      },
    };
  }
}

export const migrationService = MigrationService.getInstance();