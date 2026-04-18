import { db } from './schema';

export interface ProjectState {
  currentProjectId: string | null;
  projects: Record<string, any>;
  pages: Record<string, any>;
  canvases: Record<string, any>;
  projectOrder?: string[];
  metadata?: {
    savedAt: string;
    version: string;
  };
}

export class ProjectIndexedDBStorage {
  /**
   * Сохранить состояние проекта
   */

  static async updateProject(projectId: string, updates: Partial<any>): Promise<boolean> {
  try {
    await db.projects.update(projectId, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    console.log(`✅ Проект ${projectId} обновлен в IndexedDB`);
    return true;
  } catch (error) {
    console.error('❌ Ошибка обновления проекта:', error);
    return false;
  }
}

  static async saveProject(projectState: ProjectState): Promise<boolean> {
    try {
      const timestamp = new Date().toISOString();
      
      // Сохраняем проекты
      if (projectState.projects) {
        const projectsArray = Object.values(projectState.projects).map((proj: any) => ({
          ...proj,
          updatedAt: timestamp,
        }));
        await db.projects.bulkPut(projectsArray);
      }
      
      // Сохраняем страницы
      if (projectState.pages) {
        const pagesArray = Object.values(projectState.pages).map((page: any) => ({
          ...page,
          projectId: page.projectId || projectState.currentProjectId || 'default',
          updatedAt: timestamp,
        }));
        await db.pages.bulkPut(pagesArray);
      }
      
      // Сохраняем полотна
      if (projectState.canvases) {
        const canvasesArray = Object.values(projectState.canvases).map((canvas: any) => ({
          ...canvas,
          projectId: canvas.projectId || projectState.currentProjectId || 'default',
          updatedAt: timestamp,
        }));
        await db.canvases.bulkPut(canvasesArray);
      }
      
      console.log('📁 Сохранен проект в IndexedDB');
      return true;
    } catch (error) {
      console.error('❌ Ошибка сохранения проекта в IndexedDB:', error);
      return false;
    }
  }

  /**
   * Загрузить состояние проекта
   */
  static async loadProject(): Promise<ProjectState | null> {
    try {
      const [projects, pages, canvases] = await Promise.all([
        db.projects.toArray(),
        db.pages.toArray(),
        db.canvases.toArray(),
      ]);
      
      if (projects.length === 0) {
        return null;
      }
      
      const projectsMap = projects.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
      const pagesMap = pages.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
      const canvasesMap = canvases.reduce((acc, c) => ({ ...acc, [c.id]: c }), {});
      
      // Восстанавливаем порядок страниц из metadata.order
      Object.values(pagesMap).forEach((page: any) => {
        if (page.metadata?.order !== undefined) {
          // Порядок уже есть в metadata
        }
      });
      
      return {
        currentProjectId: projects[0]?.id || null,
        projects: projectsMap,
        pages: pagesMap,
        canvases: canvasesMap,
        projectOrder: Object.keys(projectsMap),
        metadata: {
          savedAt: new Date().toISOString(),
          version: '2.0',
        },
      };
    } catch (error) {
      console.error('❌ Ошибка загрузки проекта из IndexedDB:', error);
      return null;
    }
  }

  /**
   * Получить проект по ID
   */
  static async getProjectById(id: string): Promise<any | null> {
    try {
      return await db.projects.get(id) || null;
    } catch (error) {
      console.error('❌ Ошибка получения проекта:', error);
      return null;
    }
  }

  /**
   * Получить страницы проекта
   */
  static async getProjectPages(projectId: string): Promise<any[]> {
    try {
      return await db.pages.where('projectId').equals(projectId).toArray();
    } catch (error) {
      console.error('❌ Ошибка получения страниц проекта:', error);
      return [];
    }
  }

  /**
   * Получить полотно по ID страницы
   */
  static async getCanvasByPageId(pageId: string): Promise<any | null> {
    try {
      return await db.canvases.where('pageId').equals(pageId).first() || null;
    } catch (error) {
      console.error('❌ Ошибка получения полотна:', error);
      return null;
    }
  }

  /**
   * 🆕 Удалить страницу из IndexedDB
   */
  static async deletePage(pageId: string): Promise<boolean> {
    try {
      // Сначала получаем страницу, чтобы узнать canvasId
      const page = await db.pages.get(pageId);
      
      if (page?.canvasId) {
        // Удаляем полотно
        await db.canvases.delete(page.canvasId);
        console.log(`✅ Полотно ${page.canvasId} удалено из IndexedDB`);
      }
      
      // Удаляем страницу
      await db.pages.delete(pageId);
      console.log(`✅ Страница ${pageId} удалена из IndexedDB`);
      
      return true;
    } catch (error) {
      console.error('❌ Ошибка удаления страницы из IndexedDB:', error);
      return false;
    }
  }

  /**
   * 🆕 Удалить несколько страниц
   */
  static async deletePages(pageIds: string[]): Promise<boolean> {
    try {
      for (const pageId of pageIds) {
        const page = await db.pages.get(pageId);
        if (page?.canvasId) {
          await db.canvases.delete(page.canvasId);
        }
      }
      
      await db.pages.bulkDelete(pageIds);
      console.log(`✅ Удалено ${pageIds.length} страниц из IndexedDB`);
      
      return true;
    } catch (error) {
      console.error('❌ Ошибка массового удаления страниц:', error);
      return false;
    }
  }

  /**
   * 🆕 Обновить страницу в IndexedDB
   */
  static async updatePage(pageId: string, updates: Partial<any>): Promise<boolean> {
    try {
      await db.pages.update(pageId, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      console.log(`✅ Страница ${pageId} обновлена в IndexedDB`);
      return true;
    } catch (error) {
      console.error('❌ Ошибка обновления страницы:', error);
      return false;
    }
  }

  /**
   * 🆕 Сохранить страницу в IndexedDB
   */
  static async savePage(page: any): Promise<boolean> {
    try {
      await db.pages.put({
        ...page,
        updatedAt: new Date().toISOString(),
      });
      console.log(`✅ Страница ${page.id} сохранена в IndexedDB`);
      return true;
    } catch (error) {
      console.error('❌ Ошибка сохранения страницы:', error);
      return false;
    }
  }
}