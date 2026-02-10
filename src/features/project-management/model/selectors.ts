// features/project-management/model/selectors.ts
import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '@shared/lib/state/store'

// Базовые селекторы
export const selectProjectState = (state: RootState) => state.project;

export const selectCurrentProjectId = (state: RootState) => 
  state.project.currentProjectId;

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

// 🆕 Селектор для текущего полотна
export const selectCurrentCanvas = createSelector(
  [selectCurrentPage, (state: RootState) => state.project.canvases],
  (currentPage, canvases) => {
    if (!currentPage || !currentPage.canvasId) return null;
    return canvases[currentPage.canvasId] || null;
  }
);

// 🆕 Селектор для ID нод текущего полотна
export const selectCurrentCanvasNodeIds = createSelector(
  [selectCurrentCanvas],
  (currentCanvas) => currentCanvas?.nodes || []
);

// 🆕 Селектор для viewport текущего полотна
export const selectCurrentCanvasViewport = createSelector(
  [selectCurrentCanvas],
  (currentCanvas) => currentCanvas?.viewport || { x: 0, y: 0, zoom: 1 }
);

// 🆕 Селектор для сетки текущего полотна
export const selectCurrentCanvasGrid = createSelector(
  [selectCurrentCanvas],
  (currentCanvas) => currentCanvas?.grid || { size: 20, color: '#e0e0e0', isVisible: true }
);

// 🆕 Селектор для фона текущего полотна
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

// 🆕 Селектор для полотна по ID страницы
export const selectCanvasByPageId = (pageId: string) => 
  (state: RootState) => {
    const page = state.project.pages[pageId];
    if (!page?.canvasId) return null;
    return state.project.canvases[page.canvasId] || null;
  };

// 🆕 Селектор для полотна по ID
export const selectCanvasById = (canvasId: string) => 
  (state: RootState) => state.project.canvases[canvasId];