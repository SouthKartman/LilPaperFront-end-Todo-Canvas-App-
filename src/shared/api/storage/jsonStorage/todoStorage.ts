// src/shared/api/storage/todoStorage.ts
import { TodoNode } from '@features/todo-nodes/model/slice';

/**
 * Тип для сериализованного TodoNode (Date → string)
 */
export type SerializedTodoNode = Omit<TodoNode, 'createdAt' | 'updatedAt' | 'dueDate'> & {
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
};

/**
 * Конвертация TodoNode → JSON-совместимый объект
 */
export const serializeTodoNode = (node: TodoNode): SerializedTodoNode => ({
  ...node,
  createdAt: node.createdAt.toISOString(),
  updatedAt: node.updatedAt.toISOString(),
  dueDate: node.dueDate ? node.dueDate.toISOString() : undefined,
});

/**
 * Конвертация JSON → TodoNode
 */
export const deserializeTodoNode = (data: SerializedTodoNode): TodoNode => ({
  ...data,
  createdAt: new Date(data.createdAt),
  updatedAt: new Date(data.updatedAt),
  dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
});

/**
 * Менеджер хранения TodoNodes
 */
export class TodoStorage {
  private static readonly STORAGE_KEY = 'todo-app-nodes';
  private static readonly LAST_SAVE_KEY = 'todo-app-last-save';

  /**
   * Проверка доступности localStorage
   */
  private static isAvailable(): boolean {
    try {
      const testKey = '__test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Сохранить все ноды
   */
  static saveNodes(nodes: Record<string, TodoNode>): boolean {
    if (!this.isAvailable()) {
      console.warn('localStorage is not available');
      return false;
    }

    try {
      const serialized = Object.values(nodes).map(serializeTodoNode);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(serialized, null, 2));
      localStorage.setItem(this.LAST_SAVE_KEY, new Date().toISOString());
      return true;
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      return false;
    }
  }

  /**
   * Загрузить все ноды
   */
  static loadNodes(): Record<string, TodoNode> {
    if (!this.isAvailable()) {
      console.warn('localStorage is not available');
      return {};
    }

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return {};

      const parsed: unknown = JSON.parse(stored);
      
      if (!Array.isArray(parsed)) {
        console.warn('Invalid data format in localStorage');
        return {};
      }

      const nodes: Record<string, TodoNode> = {};
      
      parsed.forEach((item: unknown) => {
        if (this.isValidSerializedNode(item)) {
          try {
            const node = deserializeTodoNode(item);
            nodes[node.id] = node;
          } catch {
            // Пропускаем невалидные ноды
            console.warn('Skipping invalid node during deserialization');
          }
        }
      });

      return nodes;
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return {};
    }
  }

  /**
   * Валидация структуры сериализованной ноды
   */
  private static isValidSerializedNode(data: unknown): data is SerializedTodoNode {
    if (!data || typeof data !== 'object') return false;
    
    const node = data as Record<string, unknown>;
    
    return (
      typeof node.id === 'string' &&
      typeof node.title === 'string' &&
      typeof node.description === 'string' &&
      typeof node.status === 'string' &&
      typeof node.priority === 'string' &&
      typeof node.createdAt === 'string' &&
      typeof node.updatedAt === 'string' &&
      Array.isArray(node.tags) &&
      typeof node.position?.x === 'number' &&
      typeof node.position?.y === 'number' &&
      typeof node.size?.width === 'number' &&
      typeof node.size?.height === 'number'
    );
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
  static clearAll(): boolean {
    if (!this.isAvailable()) return false;
    
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.LAST_SAVE_KEY);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Экспорт в файл
   */
  static exportToFile(nodes: Record<string, TodoNode>): void {
    const serialized = Object.values(nodes).map(serializeTodoNode);
    
    const data = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      count: serialized.length,
      nodes: serialized,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `todo-nodes-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Импорт из файла
   */
  static async importFromFile(file: File): Promise<Record<string, TodoNode>> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const data = JSON.parse(content);
          
          if (!data.nodes || !Array.isArray(data.nodes)) {
            throw new Error('Invalid file format: missing nodes array');
          }

          const nodes: Record<string, TodoNode> = {};
          
          data.nodes.forEach((item: unknown) => {
            if (this.isValidSerializedNode(item)) {
              const node = deserializeTodoNode(item);
              nodes[node.id] = node;
            }
          });

          resolve(nodes);
        } catch (error) {
          reject(new Error(`Failed to parse import file: ${error}`));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
}