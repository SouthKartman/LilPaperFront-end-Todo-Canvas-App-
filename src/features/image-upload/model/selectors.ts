import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '@shared/lib/state/store';

// Базовый селектор с защитой от undefined
export const selectImageNodesState = (state: RootState) => {
  return state?.imageNodes || { nodes: {}, selectedIds: [], isLoading: false, error: null };
};

// Все изображения в виде объекта
export const selectAllImageNodesMap = createSelector(
  selectImageNodesState,
  (imageState) => imageState?.nodes || {}
);

// Все изображения в виде массива
export const selectAllImageNodes = createSelector(
  selectAllImageNodesMap,
  (nodes) => Object.values(nodes)
);

// Изображение по ID
export const selectImageNodeById = (id: string) => 
  createSelector(
    selectAllImageNodesMap,
    (nodes) => nodes[id] || null
  );

// Выделенные изображения
export const selectSelectedImageNodes = createSelector(
  selectImageNodesState,
  (imageState) => {
    if (!imageState?.selectedIds || !imageState?.nodes) return [];
    return imageState.selectedIds
      .map(id => imageState.nodes[id])
      .filter(Boolean);
  }
);

// ID выделенных изображений
export const selectSelectedImageIds = createSelector(
  selectImageNodesState,
  (imageState) => imageState?.selectedIds || []
);

// Количество изображений
export const selectImageNodesCount = createSelector(
  selectAllImageNodesMap,
  (nodes) => Object.keys(nodes).length
);

// Статус загрузки
export const selectImageLoadingState = createSelector(
  selectImageNodesState,
  (imageState) => ({
    isLoading: imageState?.isLoading || false,
    error: imageState?.error || null,
  })
);

// Максимальный z-index среди изображений
export const selectMaxImageZIndex = createSelector(
  selectAllImageNodes,
  (images) => {
    if (!images || images.length === 0) return 0;
    return Math.max(...images.map(img => img.zIndex || 0), 0);
  }
);

// ============================================
// 🆕 НОВЫЕ СЕЛЕКТОРЫ ДЛЯ РАБОТЫ С ПОЛОТНАМИ
// ============================================

/**
 * Получить ID текущего полотна (canvas)
 */
export const selectCurrentCanvasId = createSelector(
  [(state: RootState) => state.project],
  (project) => {
    const currentProject = project.currentProjectId 
      ? project.projects[project.currentProjectId] 
      : null;
    
    if (!currentProject?.currentPageId) return null;
    
    const page = project.pages[currentProject.currentPageId];
    return page?.canvasId || null;
  }
);

/**
 * Получить список ID нод на текущем полотне
 */
export const selectCurrentCanvasNodeIds = createSelector(
  [(state: RootState) => state.project, selectCurrentCanvasId],
  (project, canvasId) => {
    if (!canvasId) return [];
    return project.canvases[canvasId]?.nodes || [];
  }
);

/**
 * ✅ ОСНОВНОЙ: изображения только для ТЕКУЩЕГО полотна (в виде объекта)
 */
export const selectCurrentCanvasImagesMap = createSelector(
  [selectAllImageNodesMap, selectCurrentCanvasNodeIds],
  (allImages, canvasNodeIds) => {
    if (!canvasNodeIds.length) return {};
    
    const result: Record<string, any> = {};
    canvasNodeIds.forEach(nodeId => {
      if (allImages[nodeId]) {
        result[nodeId] = allImages[nodeId];
      }
    });
    
    return result;
  }
);

/**
 * ✅ ОСНОВНОЙ: изображения только для ТЕКУЩЕГО полотна (в виде массива)
 * ИСПОЛЬЗУЙТЕ ЭТОТ СЕЛЕКТОР В КОМПОНЕНТАХ!
 */
export const selectCurrentCanvasImagesArray = createSelector(
  [selectCurrentCanvasImagesMap],
  (imagesMap) => Object.values(imagesMap)
);

/**
 * Получить количество изображений на текущем полотне
 */
export const selectCurrentCanvasImagesCount = createSelector(
  [selectCurrentCanvasImagesArray],
  (images) => images.length
);

/**
 * ❌ УСТАРЕЛО: Исправляем старый селектор
 * Раньше использовал linkedTodoId, теперь используем canvas
 */
export const selectImageNodesByPage = (pageId: string) =>
  createSelector(
    [(state: RootState) => state.project, selectAllImageNodesMap],
    (project, allImages) => {
      // Находим canvas для этой страницы
      const page = project.pages[pageId];
      if (!page?.canvasId) return [];
      
      const canvas = project.canvases[page.canvasId];
      if (!canvas) return [];
      
      // Возвращаем изображения для этого canvas
      const result: any[] = [];
      canvas.nodes.forEach(nodeId => {
        if (allImages[nodeId]) {
          result.push(allImages[nodeId]);
        }
      });
      
      return result;
    }
  );

/**
 * Получить все изображения для конкретного canvas
 */
export const selectImagesByCanvasId = (canvasId: string) =>
  createSelector(
    [(state: RootState) => state.project, selectAllImageNodesMap],
    (project, allImages) => {
      const canvas = project.canvases[canvasId];
      if (!canvas) return [];
      
      const result: any[] = [];
      canvas.nodes.forEach(nodeId => {
        if (allImages[nodeId]) {
          result.push(allImages[nodeId]);
        }
      });
      
      return result;
    }
  );

/**
 * Проверить, принадлежит ли изображение текущему полотну
 */
export const selectIsImageOnCurrentCanvas = (imageId: string) =>
  createSelector(
    [selectCurrentCanvasNodeIds],
    (canvasNodeIds) => canvasNodeIds.includes(imageId)
  );