import { db, DBTodo } from './schema';
import { Todo } from '@entities/todo/model/types';

export class TodoIndexedDBStorage {
  /**
   * Сохранить задачи
   */
  static async saveTodos(todos: Record<string, Todo>, projectId?: string, pageId?: string): Promise<boolean> {
    try {
      const todosArray = Object.values(todos).map(todo => ({
        ...todo,
        projectId: projectId || todo.pageId?.split('_')[0] || 'default',
        pageId: pageId || todo.pageId || 'default',
        updatedAt: new Date().toISOString(),
      }));
      
      await db.todos.bulkPut(todosArray);
      console.log(`💾 Сохранено ${todosArray.length} задач в IndexedDB`);
      return true;
    } catch (error) {
      console.error('❌ Ошибка сохранения задач в IndexedDB:', error);
      return false;
    }
  }

  /**
   * Загрузить все задачи
   */
  static async loadTodos(): Promise<Record<string, Todo>> {
    try {
      const todos = await db.todos.toArray();
      const todosMap = todos.reduce((acc, todo) => {
        acc[todo.id] = todo;
        return acc;
      }, {} as Record<string, Todo>);
      
      console.log(`📂 Загружено ${todos.length} задач из IndexedDB`);
      return todosMap;
    } catch (error) {
      console.error('❌ Ошибка загрузки задач из IndexedDB:', error);
      return {};
    }
  }

  /**
   * Загрузить задачи для конкретной страницы
   */
  static async loadTodosByPage(pageId: string): Promise<Record<string, Todo>> {
    try {
      const todos = await db.todos.where('pageId').equals(pageId).toArray();
      return todos.reduce((acc, todo) => {
        acc[todo.id] = todo;
        return acc;
      }, {} as Record<string, Todo>);
    } catch (error) {
      console.error('❌ Ошибка загрузки задач по странице:', error);
      return {};
    }
  }

  /**
   * Загрузить задачи для конкретного проекта
   */
  static async loadTodosByProject(projectId: string): Promise<Record<string, Todo>> {
    try {
      const todos = await db.todos.where('projectId').equals(projectId).toArray();
      return todos.reduce((acc, todo) => {
        acc[todo.id] = todo;
        return acc;
      }, {} as Record<string, Todo>);
    } catch (error) {
      console.error('❌ Ошибка загрузки задач по проекту:', error);
      return {};
    }
  }

  /**
   * Получить задачу по ID
   */
  static async getTodoById(id: string): Promise<Todo | null> {
    try {
      return await db.todos.get(id) || null;
    } catch (error) {
      console.error('❌ Ошибка получения задачи:', error);
      return null;
    }
  }

  /**
   * Добавить одну задачу
   */
  static async addTodo(todo: Todo): Promise<boolean> {
    try {
      await db.todos.put({
        ...todo,
        updatedAt: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      console.error('❌ Ошибка добавления задачи:', error);
      return false;
    }
  }

  /**
   * Обновить задачу
   */
  static async updateTodo(id: string, updates: Partial<Todo>): Promise<boolean> {
    try {
      await db.todos.update(id, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      console.error('❌ Ошибка обновления задачи:', error);
      return false;
    }
  }

  /**
   * Удалить задачу
   */
  static async deleteTodo(id: string): Promise<boolean> {
    try {
      await db.todos.delete(id);
      return true;
    } catch (error) {
      console.error('❌ Ошибка удаления задачи:', error);
      return false;
    }
  }

  /**
   * Удалить несколько задач
   */
  static async deleteTodos(ids: string[]): Promise<boolean> {
    try {
      await db.todos.bulkDelete(ids);
      return true;
    } catch (error) {
      console.error('❌ Ошибка удаления задач:', error);
      return false;
    }
  }

  /**
   * Поиск задач
   */
  static async searchTodos(query: string, projectId?: string): Promise<Todo[]> {
    try {
      return await db.searchTodos(query, projectId);
    } catch (error) {
      console.error('❌ Ошибка поиска задач:', error);
      return [];
    }
  }

  /**
   * Получить статистику
   */
  static async getStats(): Promise<any> {
    try {
      const [todoCount, byStatus, byPriority] = await Promise.all([
        db.todos.count(),
        db.todos.where('status').each(),
        db.todos.where('priority').each(),
      ]);
      
      return {
        total: todoCount,
        // Добавьте другую статистику по необходимости
      };
    } catch (error) {
      console.error('❌ Ошибка получения статистики:', error);
      return null;
    }
  }
}