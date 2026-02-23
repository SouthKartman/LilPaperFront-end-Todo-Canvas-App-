import Dexie, { Table } from 'dexie';
import { Todo } from '@entities/todo/model/types';
import { ImageNode } from '@entities/image/model/types';
import { Canvas, CanvasPage, CanvasProject } from '@entities/canvas/model/types';

// Расширенные типы для БД
export interface DBTodo extends Todo {
  projectId: string;
  pageId: string;
  searchText?: string;
  syncedAt?: string;
}

export interface DBImage extends ImageNode {
  projectId: string;
  pageId: string;
  // Убираем imageBlob и thumbnailBlob - файлы хранятся отдельно
}

export interface DBProject extends CanvasProject {
  createdAt: string;
  updatedAt: string;
}

export interface DBPage extends CanvasPage {
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DBCanvas extends Canvas {
  projectId: string;
  pageId: string;
  createdAt: string;
  updatedAt: string;
}

// Для отслеживания изменений (синхронизация)
export interface DBSyncLog {
  id?: number;
  entityType: 'todo' | 'image' | 'project' | 'page' | 'canvas';
  entityId: string;
  action: 'create' | 'update' | 'delete';
  timestamp: string;
  synced: boolean;
}

// 🆕 НОВЫЕ ТИПЫ ДЛЯ ХРАНЕНИЯ ФАЙЛОВ
export interface StoredFile {
  id: string; // `${projectId}_${fileName}`
  projectId: string;
  fileName: string;
  blob: Blob;
  mimeType: string;
  size: number;
  createdAt: string;
  lastAccessed?: string;
}

export interface FileMetadata {
  id?: number;
  fileName: string;
  projectId: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  storage: 'opfs' | 'indexeddb';
  savedAt: string;
  imageNodeId?: string; // Связь с нодой изображения
  width?: number;
  height?: number;
}

export class TodoAppDatabase extends Dexie {
  // Существующие таблицы
  todos!: Table<DBTodo, string>;
  images!: Table<DBImage, string>;
  projects!: Table<DBProject, string>;
  pages!: Table<DBPage, string>;
  canvases!: Table<DBCanvas, string>;
  syncLog!: Table<DBSyncLog, number>;
  
  // 🆕 НОВЫЕ ТАБЛИЦЫ ДЛЯ ФАЙЛОВ
  fileStorage!: Table<StoredFile, string>;
  fileMetadata!: Table<FileMetadata, number>;

  constructor() {
    super('TodoAppDatabase');
    
    this.version(2).stores({
      // Существующие таблицы (версия 1)
      todos: 'id, projectId, pageId, status, priority, dueDate, createdAt, updatedAt, [projectId+pageId]',
      images: 'id, projectId, pageId, mimeType, fileSize, createdAt, updatedAt, [projectId+pageId]',
      projects: 'id, name, currentPageId, createdAt, updatedAt',
      pages: 'id, projectId, canvasId, name, [projectId+metadata.order], createdAt, updatedAt',
      canvases: 'id, projectId, pageId, [projectId+pageId], updatedAt',
      syncLog: '++id, entityType, entityId, timestamp, synced',
      
      // 🆕 Новые таблицы для файлов (версия 2)
      fileStorage: 'id, projectId, fileName, mimeType, size, createdAt, lastAccessed',
      fileMetadata: '++id, fileName, projectId, storage, savedAt, imageNodeId, [projectId+fileName]',
    });
  }

  // Транзакция для перемещения ноды между страницами
  async moveNodeBetweenPages(
    nodeId: string,
    nodeType: 'todo' | 'image',
    sourcePageId: string,
    targetPageId: string,
    targetProjectId: string
  ): Promise<void> {
    return this.transaction('rw', this.todos, this.images, this.syncLog, async () => {
      const timestamp = new Date().toISOString();
      
      if (nodeType === 'todo') {
        const todo = await this.todos.get(nodeId);
        if (todo) {
          await this.todos.update(nodeId, { 
            pageId: targetPageId,
            projectId: targetProjectId,
            updatedAt: timestamp
          });
          
          await this.syncLog.add({
            entityType: 'todo',
            entityId: nodeId,
            action: 'update',
            timestamp,
            synced: false
          });
        }
      } else {
        const image = await this.images.get(nodeId);
        if (image) {
          await this.images.update(nodeId, { 
            pageId: targetPageId,
            projectId: targetProjectId,
            updatedAt: timestamp
          });
          
          await this.syncLog.add({
            entityType: 'image',
            entityId: nodeId,
            action: 'update',
            timestamp,
            synced: false
          });
          
          // Обновляем связь в метаданных файла
          const pathMatch = image.filePath?.match(/\/images\/projects\/([^/]+)\/(.+)$/);
          if (pathMatch) {
            const [, , fileName] = pathMatch;
            const metadata = await this.fileMetadata
              .where({ projectId: sourcePageId.split('_')[0], fileName })
              .first();
            
            if (metadata) {
              await this.fileMetadata.update(metadata.id!, { 
                projectId: targetProjectId,
                imageNodeId: nodeId 
              });
            }
          }
        }
      }
    });
  }

  // Поиск по задачам
  async searchTodos(searchText: string, projectId?: string): Promise<DBTodo[]> {
    let collection = this.todos.toCollection();
    
    if (projectId) {
      collection = collection.filter(todo => todo.projectId === projectId);
    }
    
    const searchLower = searchText.toLowerCase();
    return collection
      .filter(todo => 
        todo.title.toLowerCase().includes(searchLower) ||
        todo.description?.toLowerCase().includes(searchLower) ||
        todo.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      )
      .toArray();
  }

  // Получить все ноды для страницы (и задачи, и изображения)
  async getPageNodes(pageId: string): Promise<{
    todos: DBTodo[];
    images: DBImage[];
  }> {
    const [todos, images] = await Promise.all([
      this.todos.where('pageId').equals(pageId).toArray(),
      this.images.where('pageId').equals(pageId).toArray()
    ]);
    
    return { todos, images };
  }

  // Экспорт всех данных для бэкапа
  async exportAllData(): Promise<any> {
    const [todos, images, projects, pages, canvases, fileMetadata] = await Promise.all([
      this.todos.toArray(),
      this.images.toArray(),
      this.projects.toArray(),
      this.pages.toArray(),
      this.canvases.toArray(),
      this.fileMetadata.toArray(),
    ]);
    
    return {
      version: '2.0',
      exportDate: new Date().toISOString(),
      todos,
      images,
      projects,
      pages,
      canvases,
      fileMetadata,
      // Файлы не экспортируем, только метаданные
    };
  }

  // Импорт данных из бэкапа
  async importAllData(data: any): Promise<void> {
    return this.transaction('rw', 
      this.todos, this.images, this.projects, this.pages, this.canvases, this.fileMetadata,
      async () => {
        if (data.todos?.length) await this.todos.bulkPut(data.todos);
        if (data.images?.length) await this.images.bulkPut(data.images);
        if (data.projects?.length) await this.projects.bulkPut(data.projects);
        if (data.pages?.length) await this.pages.bulkPut(data.pages);
        if (data.canvases?.length) await this.canvases.bulkPut(data.canvases);
        if (data.fileMetadata?.length) await this.fileMetadata.bulkPut(data.fileMetadata);
      }
    );
  }

  // Очистка всех данных
  async clearAllData(): Promise<void> {
    await Promise.all([
      this.todos.clear(),
      this.images.clear(),
      this.projects.clear(),
      this.pages.clear(),
      this.canvases.clear(),
      this.syncLog.clear(),
      this.fileStorage.clear(),
      this.fileMetadata.clear(),
    ]);
  }

  // 🆕 НОВЫЕ МЕТОДЫ ДЛЯ РАБОТЫ С ФАЙЛАМИ
  
  /**
   * Сохранить файл в IndexedDB
   */
  async saveFile(
    file: File, 
    projectId: string, 
    fileName: string, 
    imageNodeId?: string,
    dimensions?: { width: number; height: number }
  ): Promise<void> {
    const id = `${projectId}_${fileName}`;
    const now = new Date().toISOString();
    
    await this.transaction('rw', this.fileStorage, this.fileMetadata, async () => {
      // Сохраняем сам файл
      await this.fileStorage.put({
        id,
        projectId,
        fileName,
        blob: file,
        mimeType: file.type,
        size: file.size,
        createdAt: now,
        lastAccessed: now,
      });
      
      // Сохраняем метаданные
      await this.fileMetadata.add({
        fileName,
        projectId,
        originalName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        storage: 'indexeddb',
        savedAt: now,
        imageNodeId,
        width: dimensions?.width,
        height: dimensions?.height,
      });
    });
    
    console.log(`💾 Файл сохранен в IndexedDB: ${fileName} (${(file.size / 1024).toFixed(1)} KB)`);
  }

  /**
   * Получить файл из IndexedDB
   */
  async getFile(projectId: string, fileName: string): Promise<File | null> {
    const id = `${projectId}_${fileName}`;
    const stored = await this.fileStorage.get(id);
    
    if (!stored) return null;
    
    // Обновляем время последнего доступа
    await this.fileStorage.update(id, { lastAccessed: new Date().toISOString() });
    
    return new File([stored.blob], stored.fileName, { type: stored.mimeType });
  }

  /**
   * Получить URL для отображения файла
   */
  async getFileUrl(projectId: string, fileName: string): Promise<string | null> {
    const file = await this.getFile(projectId, fileName);
    if (!file) return null;
    
    return URL.createObjectURL(file);
  }

  /**
   * Удалить файл
   */
  async deleteFile(projectId: string, fileName: string): Promise<boolean> {
    const id = `${projectId}_${fileName}`;
    
    try {
      await this.transaction('rw', this.fileStorage, this.fileMetadata, async () => {
        await this.fileStorage.delete(id);
        await this.fileMetadata.where({ projectId, fileName }).delete();
      });
      
      console.log(`🗑️ Файл удален: ${fileName}`);
      return true;
    } catch (error) {
      console.error('❌ Ошибка удаления файла:', error);
      return false;
    }
  }

  /**
   * Получить метаданные файла
   */
  async getFileMetadata(projectId: string, fileName: string): Promise<FileMetadata | null> {
    return await this.fileMetadata.where({ projectId, fileName }).first() || null;
  }

  /**
   * Получить все файлы проекта
   */
  async getProjectFiles(projectId: string): Promise<FileMetadata[]> {
    return await this.fileMetadata.where('projectId').equals(projectId).toArray();
  }

  /**
   * Получить файл по ID изображения
   */
  async getFileByImageId(imageNodeId: string): Promise<{ file: File | null; metadata: FileMetadata | null }> {
    const metadata = await this.fileMetadata.where('imageNodeId').equals(imageNodeId).first();
    if (!metadata) return { file: null, metadata: null };
    
    const file = await this.getFile(metadata.projectId, metadata.fileName);
    return { file, metadata };
  }

  /**
   * Получить URL по ID изображения
   */
  async getUrlByImageId(imageNodeId: string): Promise<string | null> {
    const metadata = await this.fileMetadata.where('imageNodeId').equals(imageNodeId).first();
    if (!metadata) return null;
    
    return await this.getFileUrl(metadata.projectId, metadata.fileName);
  }

  /**
   * Очистить неиспользуемые файлы
   */
  async cleanupUnusedFiles(): Promise<number> {
    const allMetadata = await this.fileMetadata.toArray();
    const usedImageIds = new Set((await this.images.toArray()).map(img => img.id));
    
    let deletedCount = 0;
    
    for (const metadata of allMetadata) {
      // Если файл не привязан к существующему изображению
      if (metadata.imageNodeId && !usedImageIds.has(metadata.imageNodeId)) {
        const success = await this.deleteFile(metadata.projectId, metadata.fileName);
        if (success) deletedCount++;
      }
    }
    
    console.log(`🧹 Очищено ${deletedCount} неиспользуемых файлов`);
    return deletedCount;
  }
}

export const db = new TodoAppDatabase();