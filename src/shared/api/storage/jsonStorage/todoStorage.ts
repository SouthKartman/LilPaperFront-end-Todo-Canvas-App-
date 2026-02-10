// src/shared/api/storage/todoStorage.ts
import { Todo } from '@entities/todo/model/types';

/**
 * Универсальный storage с поддержкой проектов и полотен
 */
export class TodoStorage {
  private static readonly TODOS_KEY = 'todo-app-nodes-v1';
  private static readonly LAST_SAVE_KEY = 'todo-app-last-save';
  private static readonly PROJECT_KEY = 'project_state'; // 🆕 Ключ для проекта

  /**
   * Конвертация любого объекта в обычный (включая Proxy от Immer)
   */
  private static toPlainObject<T>(obj: T): T {
    if (!obj || typeof obj !== 'object') return obj;
    
    try {
      if (typeof window !== 'undefined' && window.structuredClone) {
        return window.structuredClone(obj);
      }
      return JSON.parse(JSON.stringify(obj));
    } catch (error) {
      console.warn('⚠️ Ошибка конвертации:', error);
      if (Array.isArray(obj)) {
        return obj.map(item => this.toPlainObject(item)) as T;
      }
      
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.toPlainObject(value);
      }
      return result;
    }
  }

  /**
   * Проверка доступности localStorage
   */
  private static isStorageAvailable(): boolean {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 🆕 Сохранить состояние проекта
   */
  static saveProjectState(projectState: any): boolean {
    if (!this.isStorageAvailable()) {
      console.warn('localStorage недоступен');
      return false;
    }

    try {
      const plainState = this.toPlainObject(projectState);
      
      localStorage.setItem(this.PROJECT_KEY, JSON.stringify(plainState));
      
      const pageCount = plainState.pages ? Object.keys(plainState.pages).length : 0;
      const canvasCount = plainState.canvases ? Object.keys(plainState.canvases).length : 0;
      console.log(`💾 Сохранен проект: ${pageCount} страниц, ${canvasCount} полотен`);
      return true;
    } catch (error) {
      console.error('❌ Ошибка сохранения проекта:', error);
      return false;
    }
  }

  /**
   * 🆕 Загрузить состояние проекта
   */
  static loadProjectState(): any {
    if (!this.isStorageAvailable()) {
      return null;
    }

    try {
      const stored = localStorage.getItem(this.PROJECT_KEY);
      if (!stored) return null;
      
      // Восстанавливаем Date объекты
      const parsed = JSON.parse(stored, (key, value) => {
        if (value && typeof value === 'object' && value.__type === 'Date') {
          return new Date(value.value);
        }
        // Автоматически конвертируем строки дат
        if (key.endsWith('At') && typeof value === 'string') {
          const date = new Date(value);
          return isNaN(date.getTime()) ? value : date;
        }
        return value;
      });
      
      const pageCount = parsed.pages ? Object.keys(parsed.pages).length : 0;
      console.log(`📂 Загружен проект: ${pageCount} страниц`);
      return parsed;
    } catch (error) {
      console.error('❌ Ошибка загрузки проекта:', error);
      return null;
    }
  }

  /**
   * Сохранить задачи
   */
  static saveTodos(todos: Record<string, Todo>): boolean {
    if (!this.isStorageAvailable()) {
      console.warn('localStorage недоступен');
      return false;
    }

    try {
      const plainTodos = this.toPlainObject(todos);
      
      localStorage.setItem(this.TODOS_KEY, JSON.stringify(plainTodos));
      localStorage.setItem(this.LAST_SAVE_KEY, new Date().toISOString());
      
      console.log(`💾 Сохранено ${Object.keys(plainTodos).length} задач`);
      return true;
    } catch (error) {
      console.error('❌ Ошибка сохранения задач:', error);
      return false;
    }
  }

  /**
   * Загрузить задачи
   */
  static loadTodos(): Record<string, Todo> {
    if (!this.isStorageAvailable()) {
      return {};
    }

    try {
      const stored = localStorage.getItem(this.TODOS_KEY);
      if (!stored) return {};
      
      const parsed = JSON.parse(stored);
      console.log(`📂 Загружено ${Object.keys(parsed).length} задач`);
      return parsed;
    } catch (error) {
      console.error('❌ Ошибка загрузки задач:', error);
      return {};
    }
  }

  /**
   * Получить время последнего сохранения
   */
  static getLastSave(): Date | null {
    try {
      const dateStr = localStorage.getItem(this.LAST_SAVE_KEY);
      return dateStr ? new Date(dateStr) : null;
    } catch {
      return null;
    }
  }

  /**
   * Очистить все сохраненные данные
   */
  static clearAll(): void {
    try {
      localStorage.removeItem(this.TODOS_KEY);
      localStorage.removeItem(this.LAST_SAVE_KEY);
      localStorage.removeItem(this.PROJECT_KEY);
      console.log('🗑️ Все данные очищены');
    } catch (error) {
      console.error('❌ Ошибка очистки:', error);
    }
  }

  /**
   * Получить статистику
   */
  static getStats() {
    const todos = this.loadTodos();
    const project = this.loadProjectState();
    const lastSave = this.getLastSave();
    
    return {
      hasData: Object.keys(todos).length > 0 || project !== null,
      nodeCount: Object.keys(todos).length,
      projectCount: project ? Object.keys(project.projects || {}).length : 0,
      pageCount: project ? Object.keys(project.pages || {}).length : 0,
      lastSave: lastSave ? lastSave.toISOString() : null,
      storageAvailable: this.isStorageAvailable(),
    };
  }

  /**
   * Экспорт всего состояния
   */
  static exportToFile(data: any = null): void {
    try {
      const exportData = data || {
        version: '1.1',
        exportDate: new Date().toISOString(),
        todoNodes: this.loadTodos(),
        project: this.loadProjectState(),
      };

      const plainData = this.toPlainObject(exportData);
      
      const blob = new Blob([JSON.stringify(plainData, null, 2)], {
        type: 'application/json',
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `todo-project-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      const nodeCount = Object.keys(exportData.todoNodes || {}).length;
      const projectCount = exportData.project ? 1 : 0;
      console.log(`📤 Экспорт: ${nodeCount} задач, ${projectCount} проектов`);
    } catch (error) {
      console.error('❌ Ошибка экспорта:', error);
      alert('Ошибка при экспорте файла');
    }
  }

  /**
   * Импорт из файла
   */
  static async importFromFile(file: File): Promise<any> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const data = JSON.parse(content);
          
          // Проверяем структуру
          if (!data.todoNodes && !data.project) {
            throw new Error('Неверный формат файла');
          }

          resolve(data);
        } catch (error) {
          reject(new Error(`Не удалось прочитать файл: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`));
        }
      };
      
      reader.onerror = () => reject(new Error('Ошибка чтения файла'));
      reader.readAsText(file);
    });
  }

  /**
   * 🆕 Получить информацию о проекте
   */
  static getProjectInfo() {
    const project = this.loadProjectState();
    if (!project) return null;
    
    const currentProject = project.currentProjectId 
      ? project.projects[project.currentProjectId]
      : null;
    
    return {
      currentProject,
      totalProjects: Object.keys(project.projects || {}).length,
      totalPages: Object.keys(project.pages || {}).length,
      totalCanvases: Object.keys(project.canvases || {}).length,
    };
  }
}