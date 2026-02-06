import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ViewportState {
  scale: number;
  position: { x: number; y: number };
  minScale: number;
  maxScale: number;
  showGrid: boolean;
  gridSize: number;
  snapToGrid: boolean;
  isPanning: boolean;
  lastZoomPoint: { x: number; y: number } | null;
}

const initialState: ViewportState = {
  scale: 1,
  position: { x: 0, y: 0 },
  minScale: 0.1,
  maxScale: 10,
  showGrid: true,
  gridSize: 20,
  snapToGrid: false,
  isPanning: false,
  lastZoomPoint: null,
};

export const viewportSlice = createSlice({
  name: 'viewport',
  initialState,
  reducers: {
    setScale: (state, action: PayloadAction<number>) => {
      const newScale = Math.max(
        state.minScale,
        Math.min(state.maxScale, action.payload)
      );
      
      // Если есть последняя точка зума, применяем трансформацию к ней
      if (state.lastZoomPoint) {
        const scaleRatio = newScale / state.scale;
        state.position = {
          x: state.lastZoomPoint.x - (state.lastZoomPoint.x - state.position.x) * scaleRatio,
          y: state.lastZoomPoint.y - (state.lastZoomPoint.y - state.position.y) * scaleRatio,
        };
      }
      
      state.scale = newScale;
    },
    
    zoomIn: (state, action: PayloadAction<{ point?: { x: number; y: number } }>) => {
      const newScale = Math.min(state.maxScale, state.scale * 1.2);
      
      if (action.payload.point) {
        state.lastZoomPoint = action.payload.point;
        const scaleRatio = newScale / state.scale;
        
        state.position = {
          x: action.payload.point.x - (action.payload.point.x - state.position.x) * scaleRatio,
          y: action.payload.point.y - (action.payload.point.y - state.position.y) * scaleRatio,
        };
      }
      
      state.scale = newScale;
    },
    
    zoomOut: (state, action: PayloadAction<{ point?: { x: number; y: number } }>) => {
      const newScale = Math.max(state.minScale, state.scale / 1.2);
      
      if (action.payload.point) {
        state.lastZoomPoint = action.payload.point;
        const scaleRatio = newScale / state.scale;
        
        state.position = {
          x: action.payload.point.x - (action.payload.point.x - state.position.x) * scaleRatio,
          y: action.payload.point.y - (action.payload.point.y - state.position.y) * scaleRatio,
        };
      }
      
      state.scale = newScale;
    },
    
    setPosition: (state, action: PayloadAction<{ x: number; y: number }>) => {
      state.position = action.payload;
      state.lastZoomPoint = null;
    },
    
    panStart: (state) => {
      state.isPanning = true;
      state.lastZoomPoint = null;
    },
    
    panMove: (state, action: PayloadAction<{ delta: { x: number; y: number } }>) => {
      state.position.x += action.payload.delta.x;
      state.position.y += action.payload.delta.y;
      state.lastZoomPoint = null;
    },
    
    panEnd: (state) => {
      state.isPanning = false;
    },
    
    resetViewport: (state) => {
      state.scale = 1;
      state.position = { x: 0, y: 0 };
      state.lastZoomPoint = null;
    },
    
    fitToContent: (state, action: PayloadAction<{ 
      bounds: { x: number; y: number; width: number; height: number };
      viewportSize: { width: number; height: number };
    }>) => {
      const { bounds, viewportSize } = action.payload;
      const padding = 50;
      
      const scaleX = (viewportSize.width - padding * 2) / bounds.width;
      const scaleY = (viewportSize.height - padding * 2) / bounds.height;
      const newScale = Math.min(scaleX, scaleY, state.maxScale);
      
      state.scale = newScale;
      state.position = {
        x: (viewportSize.width - bounds.width * newScale) / 2 - bounds.x * newScale,
        y: (viewportSize.height - bounds.height * newScale) / 2 - bounds.y * newScale,
      };
      state.lastZoomPoint = null;
    },
    
    toggleGrid: (state) => {
      state.showGrid = !state.showGrid;
    },
    
    setGridSize: (state, action: PayloadAction<number>) => {
      state.gridSize = Math.max(5, Math.min(100, action.payload));
    },
    
    toggleSnap: (state) => {
      state.snapToGrid = !state.snapToGrid;
    },
    
    setSnapToGrid: (state, action: PayloadAction<boolean>) => {
      state.snapToGrid = action.payload;
    },
    
    zoomToPoint: (state, action: PayloadAction<{ 
      point: { x: number; y: number }; 
      targetScale: number 
    }>) => {
      const { point, targetScale } = action.payload;
      const newScale = Math.max(
        state.minScale,
        Math.min(state.maxScale, targetScale)
      );
      
      state.lastZoomPoint = point;
      const scaleRatio = newScale / state.scale;
      
      state.position = {
        x: point.x - (point.x - state.position.x) * scaleRatio,
        y: point.y - (point.y - state.position.y) * scaleRatio,
      };
      
      state.scale = newScale;
    },
    
    setMinScale: (state, action: PayloadAction<number>) => {
      state.minScale = Math.max(0.01, action.payload);
      if (state.scale < state.minScale) {
        state.scale = state.minScale;
      }
    },
    
    setMaxScale: (state, action: PayloadAction<number>) => {
      state.maxScale = Math.max(state.minScale + 0.1, action.payload);
      if (state.scale > state.maxScale) {
        state.scale = state.maxScale;
      }
    },
  },
});

export const {
  setScale,
  zoomIn,
  zoomOut,
  setPosition,
  panStart,
  panMove,
  panEnd,
  resetViewport,
  fitToContent,
  toggleGrid,
  setGridSize,
  toggleSnap,
  setSnapToGrid,
  zoomToPoint,
  setMinScale,
  setMaxScale,
} = viewportSlice.actions;

export const viewportActions = viewportSlice.actions;

export default viewportSlice.reducer;