import { db } from './schema';

export interface ProjectState {
  currentProjectId: string | null;
  projects: Record<string, any>;
  pages: Record<string, any>;
  canvases: Record<string, any>;
  metadata?: {
    savedAt: string;
    version: string;
  };
}

export class ProjectIndexedDBStorage {
  /**
   * Сохранить состояние проекта
   */
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
      
      return {
        currentProjectId: projects[0]?.id || null,
        projects: projectsMap,
        pages: pagesMap,
        canvases: canvasesMap,
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
}