// src/entities/project/model/types.ts
export interface Project {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  pageIds: string[];
  currentPageId: string | null;
  metadata: {
    createdAt: string;
    updatedAt: string;
    lastOpened?: string;
  };
  settings: {
    isPublic?: boolean;
    defaultViewport?: { x: number; y: number; zoom: number };
  };
}

export interface ProjectCreateDTO {
  name?: string;
  description?: string;
  icon?: string;
  template?: ProjectTemplate;
}

export type ProjectTemplate = 'blank' | 'personal' | 'work' | 'study';