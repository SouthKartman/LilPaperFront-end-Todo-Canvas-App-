// features/image-upload/model/slice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ImageNode } from '@entities/image/model/types';
import { ImageNodesState } from './types';

const initialState: ImageNodesState = {
  nodes: {},
  selectedIds: [],
  isLoading: false,
  error: null,
};

export const imageNodesSlice = createSlice({
  name: 'imageNodes',
  initialState,
  reducers: {

    // Импорт изображений
    importImages: (state, action: PayloadAction<Record<string, ImageNode>>) => {
      state.nodes = {
        ...state.nodes,
        ...action.payload,
      };
      state.error = null;
    },

    // Добавление одного изображения
    addImageNode: (state, action: PayloadAction<ImageNode>) => {
      const node = action.payload;
      state.nodes[node.id] = node;
      state.error = null;
    },
    
    // Добавление нескольких изображений
    addImageNodes: (state, action: PayloadAction<ImageNode[]>) => {
      action.payload.forEach(node => {
        state.nodes[node.id] = node;
      });
      state.error = null;
    },
    
    // Обновление изображения
    updateImageNode: (state, action: PayloadAction<Partial<ImageNode> & { id: string }>) => {
      const { id, ...updates } = action.payload;
      if (state.nodes[id]) {
        state.nodes[id] = {
          ...state.nodes[id],
          ...updates,
          updatedAt: new Date().toISOString(),
        };
      }
    },
    
    // Перемещение изображения
    moveImageNode: (state, action: PayloadAction<{ id: string; position: { x: number; y: number } }>) => {
      const { id, position } = action.payload;
      if (state.nodes[id]) {
        state.nodes[id].position = position;
        state.nodes[id].updatedAt = new Date().toISOString();
      }
    },
    
    // Изменение размера изображения
    resizeImageNode: (state, action: PayloadAction<{ id: string; size: { width: number; height: number } }>) => {
      const { id, size } = action.payload;
      if (state.nodes[id]) {
        state.nodes[id].size = size;
        state.nodes[id].updatedAt = new Date().toISOString();
      }
    },
    
    // Изменение z-index
    setImageZIndex: (state, action: PayloadAction<{ id: string; zIndex: number }>) => {
      const { id, zIndex } = action.payload;
      if (state.nodes[id]) {
        state.nodes[id].zIndex = zIndex;
      }
    },
    
    // Удаление изображения
    deleteImageNode: (state, action: PayloadAction<string>) => {
      delete state.nodes[action.payload];
      state.selectedIds = state.selectedIds.filter(id => id !== action.payload);
    },
    
    // Удаление нескольких изображений
    deleteImageNodes: (state, action: PayloadAction<string[]>) => {
      action.payload.forEach(id => {
        delete state.nodes[id];
      });
      state.selectedIds = state.selectedIds.filter(id => !action.payload.includes(id));
    },
    
    // Выделение изображения
    selectImageNode: (state, action: PayloadAction<string>) => {
      if (!state.selectedIds.includes(action.payload)) {
        state.selectedIds.push(action.payload);
      }
    },
    
    // Снятие выделения
    deselectImageNode: (state, action: PayloadAction<string>) => {
      state.selectedIds = state.selectedIds.filter(id => id !== action.payload);
    },
    
    // Очистка выделения
    clearImageSelection: (state) => {
      state.selectedIds = [];
    },
    
    // Выделение нескольких изображений
    selectMultipleImages: (state, action: PayloadAction<string[]>) => {
      state.selectedIds = action.payload;
    },
    
    // Установка состояния загрузки
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    // Установка ошибки
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    // Очистка всех изображений
    clearAllImages: (state) => {
      state.nodes = {};
      state.selectedIds = [];
      state.error = null;
    },
  },
});

export const {
  addImageNode,
  addImageNodes,
  updateImageNode,
  moveImageNode,
  resizeImageNode,
  setImageZIndex,
  deleteImageNode,
  deleteImageNodes,
  selectImageNode,
  deselectImageNode,
  clearImageSelection,
  selectMultipleImages,
  setLoading,
  setError,
  clearAllImages,
  importImages,
} = imageNodesSlice.actions;

export default imageNodesSlice.reducer;