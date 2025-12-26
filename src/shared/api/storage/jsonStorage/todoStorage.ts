// src/shared/api/storage/todoStorage.ts
import { Todo } from '@entities/todo/model/types';

/**
 * Универсальный storage с несколькими уровнями fallback
 * Упрощенная версия с исправлением Proxy
 */
export class TodoStorage {
  private static readonly STORAGE_KEY = 'todo-app-nodes-v1';
  private static readonly LAST_SAVE_KEY = 'todo-app-last-save';

  /**
   * Конвертация любого объекта в обычный (включая Proxy от Immer)
   */
  private static toPlainObject<T>(obj: T): T {
    // Если это уже обычный объект, возвращаем как есть
    if (!obj || typeof obj !== 'object') return obj;
    
    try {
      // Лучший способ для Immer Proxy
      if (typeof window !== 'undefined' && window.structuredClone) {
        return window.structuredClone(obj);
      }
      
      // Fallback для старых браузеров
      return JSON.parse(JSON.stringify(obj));
    } catch (error) {
      console.warn('⚠️ Ошибка конвертации:', error);
      // Ручное копирование как последнее средство
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
   * Сохранить задачи
   */
  static saveTodos(todos: Record<string, Todo>): boolean {
    if (!this.isStorageAvailable()) {
      console.warn('localStorage недоступен');
      return false;
    }

    try {
      // Конвертируем перед сохранением
      const plainTodos = this.toPlainObject(todos);
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(plainTodos));
      localStorage.setItem(this.LAST_SAVE_KEY, new Date().toISOString());
      
      console.log(`💾 Сохранено ${Object.keys(plainTodos).length} задач`);
      return true;
    } catch (error) {
      console.error('❌ Ошибка сохранения:', error);
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
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return {};
      
      const parsed = JSON.parse(stored);
      console.log(`📂 Загружено ${Object.keys(parsed).length} задач`);
      return parsed;
    } catch (error) {
      console.error('❌ Ошибка загрузки:', error);
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
   * Очистить сохраненные данные
   */
  static clearAll(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.LAST_SAVE_KEY);
      console.log('🗑️ Данные очищены');
    } catch (error) {
      console.error('❌ Ошибка очистки:', error);
    }
  }

  /**
   * Получить статистику
   */
  static getStats() {
    const todos = this.loadTodos();
    const lastSave = this.getLastSave();
    
    return {
      hasData: Object.keys(todos).length > 0,
      nodeCount: Object.keys(todos).length,
      lastSave: lastSave ? lastSave.toISOString() : null,
      storageAvailable: this.isStorageAvailable(),
    };
  }

  /**
   * Экспорт в файл
   */
  static exportToFile(nodes: Record<string, Todo>): void {
    try {
      const plainNodes = this.toPlainObject(nodes);
      
      const data = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        count: Object.keys(plainNodes).length,
        nodes: plainNodes,
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `todo-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      console.log('📤 Экспортировано задач:', Object.keys(plainNodes).length);
    } catch (error) {
      console.error('❌ Ошибка экспорта:', error);
      alert('Ошибка при экспорте файла');
    }
  }

  /**
   * Импорт из файла
   */
  static async importFromFile(file: File): Promise<Record<string, Todo>> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const data = JSON.parse(content);
          
          if (!data.nodes || typeof data.nodes !== 'object') {
            throw new Error('Неверный формат файла');
          }

          resolve(data.nodes);
        } catch (error) {
          reject(new Error(`Не удалось прочитать файл: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`));
        }
      };
      
      reader.onerror = () => reject(new Error('Ошибка чтения файла'));
      reader.readAsText(file);
    });
  }
}