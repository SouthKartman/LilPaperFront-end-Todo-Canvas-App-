// src/shared/api/storage/todoStorage.ts
import { Todo } from '@entities/todo/model/types';

/**
 * Универсальный storage с несколькими уровнями fallback
 * ИСПРАВЛЕНА проблема с proxy
 */
export class TodoStorage {
  private static readonly STORAGE_KEY = 'todo-app-nodes-v1';
  private static readonly LAST_SAVE_KEY = 'todo-app-last-save';
  private static readonly COOKIE_KEY = 'todo-nodes-backup';
  private static readonly COOKIE_EXPIRY_DAYS = 7;

  /**
   * КОНВЕРТАЦИЯ PROXY → ОБЫЧНЫЙ ОБЪЕКТ
   * Это ключевое исправление!
   */
  private static convertToPlainObject(todos: Record<string, Todo>): Record<string, Todo> {
    // Если это уже обычный объект, возвращаем как есть
    if (!todos || typeof todos !== 'object') return {};
    
    try {
      // Самый безопасный способ - через JSON.stringify/parse
      const jsonString = JSON.stringify(todos);
      return JSON.parse(jsonString);
    } catch (error) {
      console.warn('⚠️ Ошибка конвертации proxy:', error);
      
      // Альтернативный способ - ручное копирование
      const plainObject: Record<string, Todo> = {};
      
      for (const [key, value] of Object.entries(todos)) {
        if (value && typeof value === 'object') {
          // Рекурсивно копируем каждый объект
          plainObject[key] = { ...value };
        }
      }
      
      return plainObject;
    }
  }

  /**
   * Проверка localStorage
   */
  private static isLocalStorageAvailable(): boolean {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch {
      console.warn('⚠️ localStorage недоступен');
      return false;
    }
  }

  /**
   * Проверка sessionStorage
   */
  private static isSessionStorageAvailable(): boolean {
    try {
      const testKey = '__storage_test__';
      sessionStorage.setItem(testKey, testKey);
      sessionStorage.removeItem(testKey);
      return true;
    } catch {
      console.warn('⚠️ sessionStorage недоступен');
      return false;
    }
  }

  /**
   * Проверка cookies
   */
  private static areCookiesAvailable(): boolean {
    try {
      // Более безопасная проверка cookies
      if (!navigator.cookieEnabled) return false;
      
      document.cookie = 'testCookie=1; SameSite=Strict; Max-Age=1';
      const canSet = document.cookie.includes('testCookie');
      document.cookie = 'testCookie=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      return canSet;
    } catch {
      console.warn('⚠️ Cookies недоступны');
      return false;
    }
  }

  /**
   * Сохранить данные во все доступные хранилища
   * ИСПРАВЛЕНО: конвертируем proxy перед сохранением
   */
  static saveTodos(todos: Record<string, Todo>): boolean {
    // КОНВЕРТИРУЕМ ПРОКСИ В ОБЫЧНЫЙ ОБЪЕКТ!
    const plainTodos = this.convertToPlainObject(todos);
    
    try {
      const data = JSON.stringify(plainTodos);
      const savedTo: string[] = [];
      
      // 1. Основное хранилище - localStorage
      if (this.isLocalStorageAvailable()) {
        try {
          localStorage.setItem(this.STORAGE_KEY, data);
          localStorage.setItem(this.LAST_SAVE_KEY, new Date().toISOString());
          savedTo.push('localStorage');
        } catch (storageError) {
          console.warn('⚠️ Ошибка localStorage:', storageError);
        }
      }
      
      // 2. Резервное хранилище - sessionStorage
      if (this.isSessionStorageAvailable()) {
        try {
          sessionStorage.setItem(this.STORAGE_KEY, data);
          savedTo.push('sessionStorage');
        } catch (storageError) {
          console.warn('⚠️ Ошибка sessionStorage:', storageError);
        }
      }
      
      // 3. Дополнительное хранилище - cookies
      if (this.areCookiesAvailable() && data.length < 2000) {
        try {
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + this.COOKIE_EXPIRY_DAYS);
          
          const cookieValue = encodeURIComponent(data);
          document.cookie = `${this.COOKIE_KEY}=${cookieValue}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Strict`;
          savedTo.push('cookies');
        } catch (cookieError) {
          console.warn('⚠️ Ошибка cookies:', cookieError);
        }
      }
      
      if (savedTo.length > 0) {
        console.log(`💾 Сохранено ${Object.keys(plainTodos).length} задач в: ${savedTo.join(', ')}`);
        return true;
      } else {
        console.warn('⚠️ Не удалось сохранить ни в одно хранилище');
        return false;
      }
    } catch (error) {
      console.error('❌ Критическая ошибка сохранения:', error);
      return false;
    }
  }

  /**
   * Загрузить данные (пробуем все хранилища по порядку)
   */
  static loadTodos(): Record<string, Todo> {
    // Сначала пробуем localStorage
    try {
      if (this.isLocalStorageAvailable()) {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log(`📂 Загружено ${Object.keys(parsed).length} задач из localStorage`);
          return parsed;
        }
      }
    } catch (error) {
      console.warn('⚠️ Ошибка загрузки из localStorage:', error);
    }
    
    // Потом sessionStorage
    try {
      if (this.isSessionStorageAvailable()) {
        const stored = sessionStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log(`📂 Загружено ${Object.keys(parsed).length} задач из sessionStorage`);
          return parsed;
        }
      }
    } catch (error) {
      console.warn('⚠️ Ошибка загрузки из sessionStorage:', error);
    }
    
    // В крайнем случае cookies
    try {
      if (this.areCookiesAvailable()) {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const trimmed = cookie.trim();
          if (trimmed.startsWith(`${this.COOKIE_KEY}=`)) {
            const value = trimmed.substring(this.COOKIE_KEY.length + 1);
            if (value) {
              const parsed = JSON.parse(decodeURIComponent(value));
              console.log(`📂 Загружено ${Object.keys(parsed).length} задач из cookies`);
              return parsed;
            }
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Ошибка загрузки из cookies:', error);
    }
    
    console.log('📭 Нет сохраненных данных ни в одном хранилище');
    return {};
  }

  /**
   * Получить время последнего сохранения
   */
  static getLastSave(): Date | null {
    try {
      if (this.isLocalStorageAvailable()) {
        const dateStr = localStorage.getItem(this.LAST_SAVE_KEY);
        if (dateStr) {
          const date = new Date(dateStr);
          // Проверяем, что дата валидна
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Ошибка получения даты сохранения:', error);
    }
    
    return null;
  }

  /**
   * Очистить все хранилища
   */
  static clearAll(): void {
    try {
      // Очищаем localStorage
      if (this.isLocalStorageAvailable()) {
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem(this.LAST_SAVE_KEY);
      }
      
      // Очищаем sessionStorage
      if (this.isSessionStorageAvailable()) {
        sessionStorage.removeItem(this.STORAGE_KEY);
      }
      
      // Очищаем cookies
      if (this.areCookiesAvailable()) {
        document.cookie = `${this.COOKIE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        document.cookie = `${this.COOKIE_KEY}-last-save=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      }
      
      console.log('🗑️ Все хранилища очищены');
    } catch (error) {
      console.error('❌ Ошибка очистки хранилищ:', error);
    }
  }

  /**
   * Получить статистику хранилища
   */
  static getStorageStats() {
    const todos = this.loadTodos();
    const lastSave = this.getLastSave();
    
    return {
      hasData: Object.keys(todos).length > 0,
      nodeCount: Object.keys(todos).length,
      lastSave: lastSave ? lastSave.toISOString() : null,
      localStorage: this.isLocalStorageAvailable(),
      sessionStorage: this.isSessionStorageAvailable(),
      cookies: this.areCookiesAvailable(),
    };
  }

  /**
   * Проверить, есть ли сохраненные данные
   */
  static hasSavedData(): boolean {
    return this.getSavedCount() > 0;
  }

  /**
   * Получить количество сохраненных задач
   */
  static getSavedCount(): number {
    const todos = this.loadTodos();
    return Object.keys(todos).length;
  }

  /**
   * Экспортировать задачи в файл
   * ИСПРАВЛЕНО: конвертируем proxy перед экспортом
   */
  static exportToFile(nodes: Record<string, Todo>): void {
    try {
      // КОНВЕРТИРУЕМ ПРОКСИ!
      const plainNodes = this.convertToPlainObject(nodes);
      
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
      a.click();
      
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);
      
      console.log('📤 Экспортировано задач:', Object.keys(plainNodes).length);
    } catch (error) {
      console.error('❌ Ошибка экспорта:', error);
      alert('Ошибка при экспорте файла');
    }
  }

  /**
   * Импортировать задачи из файла
   */
  static async importFromFile(file: File): Promise<Record<string, Todo>> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const data = JSON.parse(content);
          
          if (!data.nodes || typeof data.nodes !== 'object') {
            throw new Error('Неверный формат файла: отсутствуют данные задач');
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

  /**
   * Проверить размер данных
   */
  static getDataSize(): { readable: string } {
    try {
      const todos = this.loadTodos();
      const jsonString = JSON.stringify(todos);
      const bytes = new Blob([jsonString]).size;
      const kilobytes = bytes / 1024;
      
      if (kilobytes < 1024) {
        return { readable: `${kilobytes.toFixed(1)} KB` };
      } else {
        return { readable: `${(kilobytes / 1024).toFixed(2)} MB` };
      }
    } catch {
      return { readable: '0 KB' };
    }
  }

  /**
   * Прямое тестирование хранилища
   */
  static testStorage(): boolean {
    try {
      const testData = {
        test: {
          id: 'test',
          title: 'Тестовая задача',
          description: 'Тест сохранения',
          status: 'todo' as const,
          priority: 'medium' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: ['тест'],
          position: { x: 0, y: 0 },
          size: { width: 100, height: 100 },
        }
      };

      // Сохраняем
      const saved = this.saveTodos(testData);
      if (!saved) {
        console.error('❌ Тест не пройден: не удалось сохранить');
        return false;
      }

      // Загружаем
      const loaded = this.loadTodos();
      if (!loaded || !loaded.test) {
        console.error('❌ Тест не пройден: не удалось загрузить');
        return false;
      }

      // Очищаем
      this.clearAll();
      
      console.log('✅ Тест хранилища пройден успешно');
      return true;
    } catch (error) {
      console.error('❌ Тест хранилища не пройден:', error);
      return false;
    }
  }
}