import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { PluginNodeData } from '@entities/plugin-node/model/types';
import { RootState } from '@shared/lib/state/store';

interface PluginNodesState {
  nodes: Record<string, PluginNodeData>;
  ids: string[];
  selectedNodeIds: string[];
  isLoading: boolean;
  error: string | null;
}

const initialState: PluginNodesState = {
  nodes: {},
  ids: [],
  selectedNodeIds: [],
  isLoading: false,
  error: null,
};

// Асинхронные thunks
export const savePluginNodeToDB = createAsyncThunk(
  'pluginNodes/saveToDB',
  async (node: PluginNodeData) => {
    // Создаем копию без циклических ссылок
    const serializableNode = {
      ...node,
      // Убеждаемся, что нет компонентов или функций
      pluginProps: JSON.parse(JSON.stringify(node.pluginProps || {}))
    };
    console.log('Save plugin node to DB:', serializableNode.id);
    return serializableNode;
  }
);

export const deletePluginNodeFromDB = createAsyncThunk(
  'pluginNodes/deleteFromDB',
  async (id: string) => {
    console.log('Delete plugin node from DB:', id);
    return id;
  }
);

const pluginNodesSlice = createSlice({
  name: 'pluginNodes',
  initialState,
  reducers: {
    addPluginNode: (state, action: PayloadAction<PluginNodeData>) => {
      const node = action.payload;
      // Убеждаемся, что node сериализуемый
      if (node && typeof node === 'object') {
        state.nodes[node.id] = {
          ...node,
          // Очищаем любые не-сериализуемые данные
          pluginProps: JSON.parse(JSON.stringify(node.pluginProps || {}))
        };
        state.ids.push(node.id);
        console.log('✅ Plugin node added:', node.id, node.pluginId);
      } else {
        console.error('Invalid plugin node:', node);
      }
    },
    
    updatePluginNode: (state, action: PayloadAction<{ id: string } & Partial<PluginNodeData>>) => {
      const { id, ...updates } = action.payload;
      if (state.nodes[id]) {
        state.nodes[id] = { 
          ...state.nodes[id], 
          ...updates,
          // Очищаем не-сериализуемые данные
          pluginProps: updates.pluginProps 
            ? JSON.parse(JSON.stringify(updates.pluginProps))
            : state.nodes[id].pluginProps,
          updatedAt: Date.now() 
        };
        console.log('✅ Plugin node updated:', id);
      }
    },
    
    deletePluginNode: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      if (state.nodes[id]) {
        delete state.nodes[id];
        state.ids = state.ids.filter(i => i !== id);
        state.selectedNodeIds = state.selectedNodeIds.filter(i => i !== id);
        console.log('✅ Plugin node deleted:', id);
      }
    },
    
    deleteMultiplePluginNodes: (state, action: PayloadAction<string[]>) => {
      const idsToDelete = new Set(action.payload);
      idsToDelete.forEach(id => {
        delete state.nodes[id];
      });
      state.ids = state.ids.filter(id => !idsToDelete.has(id));
      state.selectedNodeIds = state.selectedNodeIds.filter(id => !idsToDelete.has(id));
      console.log('✅ Multiple plugin nodes deleted:', idsToDelete.size);
    },
    
    selectPluginNode: (state, action: PayloadAction<string>) => {
      if (!state.selectedNodeIds.includes(action.payload)) {
        state.selectedNodeIds.push(action.payload);
      }
    },
    
    deselectPluginNode: (state, action: PayloadAction<string>) => {
      state.selectedNodeIds = state.selectedNodeIds.filter(id => id !== action.payload);
    },
    
    toggleSelectPluginNode: (state, action: PayloadAction<string>) => {
      const index = state.selectedNodeIds.indexOf(action.payload);
      if (index === -1) {
        state.selectedNodeIds.push(action.payload);
      } else {
        state.selectedNodeIds.splice(index, 1);
      }
    },
    
    clearPluginSelection: (state) => {
      state.selectedNodeIds = [];
    },
    
    setSelectedNodes: (state, action: PayloadAction<string[]>) => {
      state.selectedNodeIds = action.payload;
    },
    
    updatePluginNodePosition: (state, action: PayloadAction<{ id: string; position: { x: number; y: number } }>) => {
      const { id, position } = action.payload;
      if (state.nodes[id]) {
        state.nodes[id].position = position;
        state.nodes[id].updatedAt = Date.now();
      }
    },
    
    resizePluginNode: (state, action: PayloadAction<{ id: string; width: number; height: number }>) => {
      const { id, width, height } = action.payload;
      if (state.nodes[id]) {
        state.nodes[id].width = width;
        state.nodes[id].height = height;
        state.nodes[id].updatedAt = Date.now();
      }
    },
    
    setPluginNodeZIndex: (state, action: PayloadAction<{ id: string; zIndex: number }>) => {
      const { id, zIndex } = action.payload;
      if (state.nodes[id]) {
        state.nodes[id].zIndex = zIndex;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(savePluginNodeToDB.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(savePluginNodeToDB.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.nodes[action.payload.id] = action.payload;
        }
      })
      .addCase(savePluginNodeToDB.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to save plugin node';
      })
      .addCase(deletePluginNodeFromDB.fulfilled, (state, action) => {
        console.log(`Plugin node ${action.payload} deleted from DB`);
      });
  },
});

// Безопасные селекторы
export const selectAllPluginNodes = (state: RootState) => {
  if (!state?.pluginNodes?.ids) return [];
  return state.pluginNodes.ids
    .map(id => state.pluginNodes.nodes[id])
    .filter(Boolean);
};
  
export const selectPluginNodeById = (state: RootState, id: string) => {
  if (!state?.pluginNodes?.nodes) return undefined;
  return state.pluginNodes.nodes[id];
};
  
export const selectSelectedPluginNodeIds = (state: RootState) => {
  if (!state?.pluginNodes?.selectedNodeIds) return [];
  return state.pluginNodes.selectedNodeIds;
};
  
export const selectSelectedPluginNodes = (state: RootState) => {
  if (!state?.pluginNodes?.selectedNodeIds) return [];
  return state.pluginNodes.selectedNodeIds
    .map(id => state.pluginNodes.nodes[id])
    .filter(Boolean);
};
  
export const selectPluginNodesLoading = (state: RootState) => {
  return state?.pluginNodes?.isLoading ?? false;
};
  
export const selectPluginNodesError = (state: RootState) => {
  return state?.pluginNodes?.error ?? null;
};
  
export const selectPluginNodesCount = (state: RootState) => {
  return state?.pluginNodes?.ids?.length ?? 0;
};

export const {
  addPluginNode,
  updatePluginNode,
  deletePluginNode,
  deleteMultiplePluginNodes,
  selectPluginNode,
  deselectPluginNode,
  toggleSelectPluginNode,
  clearPluginSelection,
  setSelectedNodes,
  updatePluginNodePosition,
  resizePluginNode,
  setPluginNodeZIndex,
} = pluginNodesSlice.actions;

export default pluginNodesSlice.reducer;