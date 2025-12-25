// src/shared/api/storage/localStorage.ts

/**
 * Базовые операции с localStorage с обработкой ошибок
 */
export class LocalStorage {
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
   * Сохранить данные в localStorage
   */
  static set<T>(key: string, data: T): boolean {
    if (!this.isAvailable()) {
      console.warn('localStorage is not available');
      return false;
    }

    try {
      const serialized = JSON.stringify(data, null, 2);
      localStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      return false;
    }
  }

  /**
   * Загрузить данные из localStorage
   */
  static get<T>(key: string, defaultValue: T): T {
    if (!this.isAvailable()) {
      console.warn('localStorage is not available');
      return defaultValue;
    }

    try {
      const serialized = localStorage.getItem(key);
      if (serialized === null) {
        return defaultValue;
      }
      return JSON.parse(serialized) as T;
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return defaultValue;
    }
  }

  /**
   * Удалить данные из localStorage
   */
  static remove(key: string): boolean {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Очистить все данные приложения
   */
  static clear(): boolean {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      // Удаляем только ключи нашего приложения
      const appKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('todo-app-')
      );
      appKeys.forEach(key => localStorage.removeItem(key));
      return true;
    } catch {
      return false;
    }
  }
}