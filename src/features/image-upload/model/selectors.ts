import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '@shared/lib/state/store';

// Базовый селектор с защитой от undefined
export const selectImageNodesState = (state: RootState) => {
  // Проверяем, что state.imageNodes существует
  return state?.imageNodes || { nodes: {}, selectedIds: [], isLoading: false, error: null };
};

// Все изображения в виде массива
export const selectAllImageNodes = createSelector(
  selectImageNodesState,
  (imageState) => {
    // Проверяем, что nodes существует
    return imageState?.nodes ? Object.values(imageState.nodes) : [];
  }
);

// Изображение по ID
export const selectImageNodeById = (id: string) => 
  createSelector(
    selectImageNodesState,
    (imageState) => imageState?.nodes?.[id] || null
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
  selectImageNodesState,
  (imageState) => imageState?.nodes ? Object.keys(imageState.nodes).length : 0
);

// Изображения на определенной странице
export const selectImageNodesByPage = (pageId: string) =>
  createSelector(
    selectAllImageNodes,
    (images) => images.filter(img => img.linkedTodoId === pageId)
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