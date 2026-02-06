import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '@shared/lib/state/store';

export const selectViewport = (state: RootState) => state.viewport;

export const selectViewportTransform = createSelector(
  selectViewport,
  (viewport) => ({
    x: viewport.position.x,
    y: viewport.position.y,
    scale: viewport.scale,
    zoom: viewport.scale, // alias для обратной совместимости
  })
);

export const selectViewportWithBounds = createSelector(
  selectViewport,
  (_, containerSize: { width: number; height: number }) => containerSize,
  (viewport, containerSize) => ({
    ...viewport,
    bounds: {
      left: -viewport.position.x / viewport.scale,
      top: -viewport.position.y / viewport.scale,
      width: containerSize.width / viewport.scale,
      height: containerSize.height / viewport.scale,
    },
  })
);

export const selectGridConfig = createSelector(
  selectViewport,
  (viewport) => ({
    showGrid: viewport.showGrid,
    gridSize: viewport.gridSize,
    snapToGrid: viewport.snapToGrid,
  })
);

export const selectIsPanning = createSelector(
  selectViewport,
  (viewport) => viewport.isPanning
);

export const selectZoomPercentage = createSelector(
  selectViewport,
  (viewport) => Math.round(viewport.scale * 100)
);

export const selectCanvasToScreen = createSelector(
  selectViewport,
  (viewport) => (point: { x: number; y: number }) => ({
    x: point.x * viewport.scale + viewport.position.x,
    y: point.y * viewport.scale + viewport.position.y,
  })
);

export const selectScreenToCanvas = createSelector(
  selectViewport,
  (viewport) => (point: { x: number; y: number }) => ({
    x: (point.x - viewport.position.x) / viewport.scale,
    y: (point.y - viewport.position.y) / viewport.scale,
  })
);

export const selectSnapPosition = createSelector(
  selectViewport,
  (viewport) => (position: { x: number; y: number }) => {
    if (!viewport.snapToGrid) return position;
    
    const effectiveGridSize = viewport.gridSize * viewport.scale;
    return {
      x: Math.round(position.x / effectiveGridSize) * effectiveGridSize,
      y: Math.round(position.y / effectiveGridSize) * effectiveGridSize,
    };
  }
);