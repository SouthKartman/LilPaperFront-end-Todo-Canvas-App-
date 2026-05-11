// entities/canvas/model/types.ts
export interface CanvasPage {
  id: string;
  name: string;
  canvasId: string; // 🆕 Теперь ссылается на Canvas
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    order: number;
  };
}

export interface CanvasProject {
  id: string;
  name: string;
  pageIds: string[]; // Порядок страниц
  currentPageId: string;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface CanvasProject {
  id: string;
  name: string;
  pageIds: string[];
  currentPageId: string | null;
  preview?: string; // 👈 Добавляем поле для превью
  previewUpdatedAt?: string; // 👈 Добавляем дату обновления превью
  metadata: {
    createdAt: Date;
    updatedAt: Date;
  };
}

// 🆕 НОВЫЙ ТИП: Полотно (Canvas)
export interface Canvas {
  id: string;
  pageId: string; // ID связанной страницы
  nodes: string[]; // ID нод на этом полотне
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  background: string;
  grid: {
    size: number;
    color: string;
    isVisible: boolean;
  };
  metadata: {
    createdAt: Date;
    updatedAt: Date;
  };
}

export type ProjectExportFormat = 'json' | 'png' | 'pdf';

// 🆕 Утилита для генерации ID
export const generateId = (prefix: string = 'id'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};