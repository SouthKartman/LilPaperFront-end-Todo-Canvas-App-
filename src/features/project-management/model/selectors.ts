// src/features/project-management/model/selectors.ts
import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '@shared/lib/state/store';

export const selectProjectState = (state: RootState) => state.project;

export const selectCurrentProjectId = (state: RootState) => 
  state.project.currentProjectId;

// Селектор для проектов в правильном порядке
export const selectProjectsInOrder = createSelector(
  [selectProjectState],
  (projectState) => {
    const { projects, projectOrder } = projectState;
    
    // Защита от undefined
    if (!projects) return [];
    
    // Если есть порядок, используем его
    if (projectOrder && projectOrder.length > 0) {
      return projectOrder
        .map(id => projects[id])
        .filter(Boolean);
    }
    
    // Если нет порядка, возвращаем как есть
    return Object.values(projects);
  }
);

// Используем ProjectsInOrder для всех проектов
export const selectAllProjects = selectProjectsInOrder;

// Недавние проекты (с защитой от undefined)
export const selectRecentProjects = createSelector(
  [selectAllProjects],
  (projects) => {
    // Защита от undefined или пустого массива
    if (!projects || !Array.isArray(projects) || projects.length === 0) {
      return [];
    }
    
    return [...projects]
      .filter(p => p && !p.archived) // Проверяем что проект существует
      .sort((a, b) => {
        // Защита от undefined в metadata
        const getDate = (project: any) => {
          if (!project?.metadata) return new Date(0);
          
          const dateValue = project.metadata.updatedAt;
          if (!dateValue) return new Date(0);
          
          return dateValue instanceof Date ? dateValue : new Date(dateValue);
        };
        
        const dateA = getDate(a);
        const dateB = getDate(b);
        
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5);
  }
);

// Остальные селекторы с защитой от undefined
export const selectCurrentProject = createSelector(
  [selectProjectState, selectCurrentProjectId],
  (projectState, currentProjectId) => {
    // Защита от undefined
    if (!projectState?.projects || !currentProjectId) return null;
    return projectState.projects[currentProjectId] || null;
  }
);

export const selectCurrentPageId = createSelector(
  [selectCurrentProject],
  (currentProject) => currentProject?.currentPageId || null
);

export const selectCurrentPage = createSelector(
  [selectProjectState, selectCurrentPageId],
  (projectState, currentPageId) => {
    // Защита от undefined
    if (!projectState?.pages || !currentPageId) return null;
    return projectState.pages[currentPageId] || null;
  }
);

export const selectCurrentCanvas = createSelector(
  [selectCurrentPage, (state: RootState) => state.project.canvases],
  (currentPage, canvases) => {
    // Защита от undefined
    if (!currentPage || !currentPage.canvasId || !canvases) return null;
    return canvases[currentPage.canvasId] || null;
  }
);

export const selectCurrentCanvasNodeIds = createSelector(
  [selectCurrentCanvas],
  (currentCanvas) => currentCanvas?.nodes || []
);

export const selectCurrentCanvasViewport = createSelector(
  [selectCurrentCanvas],
  (currentCanvas) => currentCanvas?.viewport || { x: 0, y: 0, zoom: 1 }
);

export const selectCurrentCanvasGrid = createSelector(
  [selectCurrentCanvas],
  (currentCanvas) => currentCanvas?.grid || { size: 20, color: '#e0e0e0', isVisible: true }
);

export const selectCurrentCanvasBackground = createSelector(
  [selectCurrentCanvas],
  (currentCanvas) => currentCanvas?.background || '#f0f0f0'
);

export const selectProjectPages = createSelector(
  [selectCurrentProject, selectProjectState],
  (currentProject, projectState) => {
    // Защита от undefined
    if (!currentProject || !currentProject.pageIds || !projectState?.pages) return [];
    
    return currentProject.pageIds
      .map(pageId => projectState.pages[pageId])
      .filter(Boolean)
      .sort((a, b) => (a?.metadata?.order || 0) - (b?.metadata?.order || 0));
  }
);

export const selectProjectById = (projectId: string) => 
  (state: RootState) => {
    // Защита от undefined
    if (!state?.project?.projects) return null;
    return state.project.projects[projectId] || null;
  };

export const selectPageById = (pageId: string) => 
  (state: RootState) => {
    // Защита от undefined
    if (!state?.project?.pages) return null;
    return state.project.pages[pageId] || null;
  };

export const selectCanvasByPageId = (pageId: string) => 
  (state: RootState) => {
    // Защита от undefined
    if (!state?.project?.pages || !state?.project?.canvases) return null;
    
    const page = state.project.pages[pageId];
    if (!page?.canvasId) return null;
    return state.project.canvases[page.canvasId] || null;
  };

export const selectCanvasById = (canvasId: string) => 
  (state: RootState) => {
    // Защита от undefined
    if (!state?.project?.canvases) return null;
    return state.project.canvases[canvasId] || null;
  };