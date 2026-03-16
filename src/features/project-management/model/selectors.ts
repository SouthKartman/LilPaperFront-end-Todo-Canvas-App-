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

// Недавние проекты
export const selectRecentProjects = createSelector(
  [selectAllProjects],
  (projects) => {
    return [...projects]
      .filter(p => !p.archived)
      .sort((a, b) => {
        const dateA = a.metadata.updatedAt instanceof Date ? a.metadata.updatedAt : new Date(a.metadata.updatedAt);
        const dateB = b.metadata.updatedAt instanceof Date ? b.metadata.updatedAt : new Date(b.metadata.updatedAt);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5);
  }
);

// Остальные селекторы
export const selectCurrentProject = createSelector(
  [selectProjectState, selectCurrentProjectId],
  (projectState, currentProjectId) => 
    currentProjectId ? projectState.projects[currentProjectId] : null
);

export const selectCurrentPageId = createSelector(
  [selectCurrentProject],
  (currentProject) => currentProject?.currentPageId || null
);

export const selectCurrentPage = createSelector(
  [selectProjectState, selectCurrentPageId],
  (projectState, currentPageId) => 
    currentPageId ? projectState.pages[currentPageId] : null
);

export const selectCurrentCanvas = createSelector(
  [selectCurrentPage, (state: RootState) => state.project.canvases],
  (currentPage, canvases) => {
    if (!currentPage || !currentPage.canvasId) return null;
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
    if (!currentProject) return [];
    return currentProject.pageIds
      .map(pageId => projectState.pages[pageId])
      .filter(Boolean)
      .sort((a, b) => a.metadata.order - b.metadata.order);
  }
);

export const selectProjectById = (projectId: string) => 
  (state: RootState) => state.project.projects[projectId];

export const selectPageById = (pageId: string) => 
  (state: RootState) => state.project.pages[pageId];

export const selectCanvasByPageId = (pageId: string) => 
  (state: RootState) => {
    const page = state.project.pages[pageId];
    if (!page?.canvasId) return null;
    return state.project.canvases[page.canvasId] || null;
  };

export const selectCanvasById = (canvasId: string) => 
  (state: RootState) => state.project.canvases[canvasId];