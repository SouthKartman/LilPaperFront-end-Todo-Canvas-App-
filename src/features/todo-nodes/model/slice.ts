// src/features/todo-nodes/model/slice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { nanoid } from 'nanoid';
import { 
  Todo, 
  TodoStatus, 
  TodoPriority, 
  CreateTodoDto, 
  UpdateTodoDto,
  createISODate 
} from '@entities/todo/model/types';
import { TodoStorage } from '@shared/api/storage/jsonStorage/todoStorage';
import { TodoIndexedDBStorage } from '@shared/api/storage/indexedDB/todoStorage';

export interface TodoNodesState {
  nodes: Record<string, Todo>;
  selectedNodeIds: string[];
  editingNodeId: string | null;
  loading: boolean;
  error: string | null;
}

const loadInitialState = (): TodoNodesState => {
  if (typeof window === 'undefined') {
    return {
      nodes: {},
      selectedNodeIds: [],
      editingNodeId: null,
      loading: false,
      error: null,
    };
  }

  try {
    const savedTodos = TodoStorage.loadTodos();
    console.log('📂 Загружено задач из хранилища:', Object.keys(savedTodos).length);
    
    return {
      nodes: savedTodos,
      selectedNodeIds: [],
      editingNodeId: null,
      loading: false,
      error: null,
    };
  } catch (error) {
    console.error('❌ Ошибка загрузки из хранилища:', error);
    return {
      nodes: {},
      selectedNodeIds: [],
      editingNodeId: null,
      loading: false,
      error: null,
    };
  }
};

const initialState: TodoNodesState = loadInitialState();

export const deleteTodoFromDB = createAsyncThunk(
  'todoNodes/deleteFromDB',
  async (nodeId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const todo = state.todoNodes.nodes[nodeId];
      
      if (!todo) {
        console.warn(`Задача ${nodeId} не найдена в состоянии`);
        await TodoIndexedDBStorage.deleteTodo(nodeId);
        return nodeId;
      }
      
      const success = await TodoIndexedDBStorage.deleteTodo(nodeId);
      
      if (!success) {
        throw new Error('Не удалось удалить задачу из базы данных');
      }
      
      console.log(`✅ Задача ${nodeId} успешно удалена из IndexedDB`);
      
      return nodeId;
    } catch (error) {
      console.error('❌ Ошибка при удалении задачи из БД:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Ошибка удаления');
    }
  }
);

export const deleteMultipleTodosFromDB = createAsyncThunk(
  'todoNodes/deleteMultipleFromDB',
  async (nodeIds: string[], { rejectWithValue }) => {
    try {
      const success = await TodoIndexedDBStorage.deleteTodos(nodeIds);
      
      if (!success) {
        throw new Error('Не удалось удалить задачи из базы данных');
      }
      
      console.log(`✅ Удалено ${nodeIds.length} задач из IndexedDB`);
      
      return nodeIds;
    } catch (error) {
      console.error('❌ Ошибка при массовом удалении задач:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Ошибка удаления');
    }
  }
);

export const saveTodoToDB = createAsyncThunk(
  'todoNodes/saveToDB',
  async (todo: Todo, { rejectWithValue }) => {
    try {
      const success = await TodoIndexedDBStorage.addTodo(todo);
      
      if (!success) {
        throw new Error('Не удалось сохранить задачу в базу данных');
      }
      
      console.log(`✅ Задача ${todo.id} сохранена в IndexedDB`);
      return todo;
    } catch (error) {
      console.error('❌ Ошибка при сохранении задачи в БД:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Ошибка сохранения');
    }
  }
);

export const updateTodoInDB = createAsyncThunk(
  'todoNodes/updateInDB',
  async ({ id, updates }: { id: string; updates: Partial<Todo> }, { rejectWithValue }) => {
    try {
      const success = await TodoIndexedDBStorage.updateTodo(id, updates);
      
      if (!success) {
        throw new Error('Не удалось обновить задачу в базе данных');
      }
      
      console.log(`✅ Задача ${id} обновлена в IndexedDB`);
      return { id, updates };
    } catch (error) {
      console.error('❌ Ошибка при обновлении задачи в БД:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Ошибка обновления');
    }
  }
);

export const loadTodosFromDB = createAsyncThunk(
  'todoNodes/loadFromDB',
  async (_, { rejectWithValue }) => {
    try {
      const todos = await TodoIndexedDBStorage.loadTodos();
      console.log(`📂 Загружено ${Object.keys(todos).length} задач из IndexedDB`);
      return todos;
    } catch (error) {
      console.error('❌ Ошибка загрузки задач из БД:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Ошибка загрузки');
    }
  }
);

const saveState = (state: TodoNodesState) => {
  try {
    const nodesToSave = JSON.parse(JSON.stringify(state.nodes));
    TodoStorage.saveTodos(nodesToSave);
  } catch (error) {
    console.error('❌ Ошибка автосохранения:', error);
  }
};

export const createAutoSaveMiddleware = () => (store: any) => (next: any) => (action: any) => {
  const result = next(action);
  
  const saveActions = [
    'todoNodes/createTodo',
    'todoNodes/updateTodo',
    'todoNodes/moveTodo',
    'todoNodes/setTodoStatus',
    'todoNodes/setTodoPriority',
    'todoNodes/clearAllNodes',
    'todoNodes/importNodes',
    'todoNodes/duplicateTodo',
    'project/addPage',
    'project/switchPage',
    'project/removePage',
  ];
  
  if (saveActions.includes(action.type)) {
    setTimeout(() => {
      const state = store.getState();
      saveState(state.todoNodes);
    }, 0);
  }
  
  return result;
};

export const todoNodesSlice = createSlice({
  name: 'todoNodes',
  initialState,
  reducers: {
    createTodo: (state, action: PayloadAction<CreateTodoDto & { pageId?: string }>) => {
      const id = nanoid();
      const now = createISODate();
      const payload = action.payload;
      const currentPageId = (() => {
        if (typeof window === 'undefined') return 'default_page';
        try {
          const projectState = localStorage.getItem('project_state');
          if (projectState) {
            const parsed = JSON.parse(projectState);
            const currentProject = parsed.projects[parsed.currentProjectId];
            return currentProject?.currentPageId || 'default_page';
          }
        } catch (error) {
          console.error('❌ Ошибка получения текущей страницы:', error);
        }
        return 'default_page';
      })();
      
      const newTodo: Todo = {
        id,
        title: payload.title,
        description: payload.description || '',
        status: payload.status || 'todo',
        priority: payload.priority || 'medium',
        createdAt: now,
        updatedAt: now,
        dueDate: payload.dueDate ? createISODate(payload.dueDate) : undefined,
        tags: payload.tags || [],
        parentId: payload.parentId,
        assignee: undefined,
        position: payload.position || { x: 100, y: 100 },
        size: { width: 200, height: 150 },
        pageId: payload.pageId || currentPageId,
      };
      
      state.nodes[id] = newTodo;
      
      const newTodoCopy = { ...newTodo };
      setTimeout(() => {
        TodoIndexedDBStorage.addTodo(newTodoCopy).catch(console.error);
      }, 0);
    },

    createTodoAtPosition: (
      state, 
      action: PayloadAction<{
        position: { x: number; y: number };
        title?: string;
        priority?: TodoPriority;
        pageId?: string;
      }>
    ) => {
      const id = nanoid();
      const now = createISODate();
      const { position, title = 'Новая задача', priority = 'medium', pageId } = action.payload;
      const currentPageId = (() => {
        if (typeof window === 'undefined') return 'default_page';
        try {
          const projectState = localStorage.getItem('project_state');
          if (projectState) {
            const parsed = JSON.parse(projectState);
            const currentProject = parsed.projects[parsed.currentProjectId];
            return currentProject?.currentPageId || 'default_page';
          }
        } catch (error) {
          console.error('❌ Ошибка получения текущей страницы:', error);
        }
        return 'default_page';
      })();
      
      const newTodo: Todo = {
        id,
        title,
        description: '',
        status: 'todo',
        priority,
        createdAt: now,
        updatedAt: now,
        dueDate: undefined,
        tags: [],
        parentId: undefined,
        assignee: undefined,
        position,
        size: { width: 280, height: 150 },
        pageId: pageId || currentPageId,
      };
      
      state.nodes[id] = newTodo;
      state.selectedNodeIds = [id];
      state.editingNodeId = id;
      
      const newTodoCopy = { ...newTodo };
      setTimeout(() => {
        TodoIndexedDBStorage.addTodo(newTodoCopy).catch(console.error);
      }, 0);
    },

    createTodoForPage: (
      state, 
      action: PayloadAction<{
        pageId: string;
        position: { x: number; y: number };
        title?: string;
      }>
    ) => {
      const id = nanoid();
      const now = createISODate();
      const { pageId, position, title = 'Новая задача' } = action.payload;
      
      const newTodo: Todo = {
        id,
        title,
        description: '',
        status: 'todo',
        priority: 'medium',
        createdAt: now,
        updatedAt: now,
        dueDate: undefined,
        tags: [],
        parentId: undefined,
        assignee: undefined,
        position,
        size: { width: 280, height: 150 },
        pageId,
      };
      
      state.nodes[id] = newTodo;
      state.selectedNodeIds = [id];
      state.editingNodeId = id;
      
      const newTodoCopy = { ...newTodo };
      setTimeout(() => {
        TodoIndexedDBStorage.addTodo(newTodoCopy).catch(console.error);
      }, 0);
    },

    moveTodoToPage: (
      state, 
      action: PayloadAction<{
        nodeId: string;
        targetPageId: string;
      }>
    ) => {
      const { nodeId, targetPageId } = action.payload;
      const node = state.nodes[nodeId];
      
      if (node) {
        node.pageId = targetPageId;
        const updatedAt = createISODate();
        node.updatedAt = updatedAt;
        
        setTimeout(() => {
          TodoIndexedDBStorage.updateTodo(nodeId, { pageId: targetPageId, updatedAt }).catch(console.error);
        }, 0);
      }
    },

    filterNodesByPage: (
      state, 
      action: PayloadAction<{
        pageId: string | null;
      }>
    ) => {
      // Этот экшен может использоваться для UI логики
    },

    duplicateTodo: (state, action: PayloadAction<string>) => {
      const originalId = action.payload;
      const originalNode = state.nodes[originalId];
      
      if (originalNode) {
        const id = nanoid();
        const now = createISODate();
        
        const newTodo: Todo = {
          ...originalNode,
          id,
          title: `${originalNode.title} (копия)`,
          position: {
            x: originalNode.position.x + 20,
            y: originalNode.position.y + 20,
          },
          createdAt: now,
          updatedAt: now,
          pageId: originalNode.pageId,
        };
        
        state.nodes[id] = newTodo;
        state.selectedNodeIds = [id];
        state.editingNodeId = null;
        
        const newTodoCopy = { ...newTodo };
        setTimeout(() => {
          TodoIndexedDBStorage.addTodo(newTodoCopy).catch(console.error);
        }, 0);
      }
    },

    updateTodo: (state, action: PayloadAction<UpdateTodoDto>) => {
      const { id, ...updates } = action.payload;
      const node = state.nodes[id];
      
      if (node) {
        const processedUpdates: any = { ...updates };
        
        if ('dueDate' in updates) {
          processedUpdates.dueDate = updates.dueDate 
            ? createISODate(updates.dueDate) 
            : undefined;
        }
        
        const updatedAt = createISODate();
        
        Object.assign(node, {
          ...processedUpdates,
          updatedAt,
        });
        
        const updatesCopy = { ...processedUpdates };
        
        setTimeout(() => {
          TodoIndexedDBStorage.updateTodo(id, {
            ...updatesCopy,
            updatedAt,
          }).catch(console.error);
        }, 0);
      }
    },

    updateTodoPartial: (
      state, 
      action: PayloadAction<{
        id: string; 
        updates: Partial<Todo>
      }>
    ) => {
      const { id, updates } = action.payload;
      const node = state.nodes[id];
      
      if (node) {
        const updatedAt = createISODate();
        
        Object.assign(node, {
          ...updates,
          updatedAt,
        });
        
        const updatesCopy = { ...updates };
        
        setTimeout(() => {
          TodoIndexedDBStorage.updateTodo(id, {
            ...updatesCopy,
            updatedAt,
          }).catch(console.error);
        }, 0);
      }
    },

    deleteTodo: (state, action: PayloadAction<string>) => {
      const nodeId = action.payload;
      state.nodes = Object.fromEntries(
        Object.entries(state.nodes).filter(([id]) => id !== nodeId)
      );
      state.selectedNodeIds = state.selectedNodeIds.filter(id => id !== nodeId);
      if (state.editingNodeId === nodeId) {
        state.editingNodeId = null;
      }
    },

    deleteSelectedTodos: (state) => {
      const selectedIds = [...state.selectedNodeIds];
      state.nodes = Object.fromEntries(
        Object.entries(state.nodes).filter(([id]) => !selectedIds.includes(id))
      );
      state.selectedNodeIds = [];
      if (state.editingNodeId && selectedIds.includes(state.editingNodeId)) {
        state.editingNodeId = null;
      }
    },

    moveTodo: (
      state, 
      action: PayloadAction<{
        id: string; 
        position: { x: number; y: number }
      }>
    ) => {
      const { id, position } = action.payload;
      const node = state.nodes[id];
      
      if (node) {
        node.position = position;
        const updatedAt = createISODate();
        node.updatedAt = updatedAt;
        
        const positionCopy = { ...position };
        
        setTimeout(() => {
          TodoIndexedDBStorage.updateTodo(id, { position: positionCopy, updatedAt }).catch(console.error);
        }, 0);
      }
    },

    resizeTodo: (
      state, 
      action: PayloadAction<{
        id: string; 
        size: { width: number; height: number }
      }>
    ) => {
      const { id, size } = action.payload;
      const node = state.nodes[id];
      
      if (node) {
        node.size = size;
        const updatedAt = createISODate();
        node.updatedAt = updatedAt;
        
        const sizeCopy = { ...size };
        
        setTimeout(() => {
          TodoIndexedDBStorage.updateTodo(id, { size: sizeCopy, updatedAt }).catch(console.error);
        }, 0);
      }
    },

    deletePageNodes: (
      state, 
      action: PayloadAction<{
        pageId: string;
      }>
    ) => {
      const { pageId } = action.payload;
      const nodesToDelete = Object.keys(state.nodes).filter(
        id => state.nodes[id].pageId === pageId
      );
      
      state.nodes = Object.fromEntries(
        Object.entries(state.nodes).filter(([id]) => !nodesToDelete.includes(id))
      );
      
      state.selectedNodeIds = state.selectedNodeIds.filter(id => !nodesToDelete.includes(id));
      
      if (state.editingNodeId && nodesToDelete.includes(state.editingNodeId)) {
        state.editingNodeId = null;
      }
      
      if (nodesToDelete.length > 0) {
        const nodesToDeleteCopy = [...nodesToDelete];
        setTimeout(() => {
          TodoIndexedDBStorage.deleteTodos(nodesToDeleteCopy).catch(console.error);
        }, 0);
      }
    },

    setTodoStatus: (
      state, 
      action: PayloadAction<{
        id: string; 
        status: TodoStatus
      }>
    ) => {
      const { id, status } = action.payload;
      const node = state.nodes[id];
      
      if (node) {
        node.status = status;
        const updatedAt = createISODate();
        node.updatedAt = updatedAt;
        
        setTimeout(() => {
          TodoIndexedDBStorage.updateTodo(id, { status, updatedAt }).catch(console.error);
        }, 0);
      }
    },

    setTodoPriority: (
      state, 
      action: PayloadAction<{
        id: string; 
        priority: TodoPriority
      }>
    ) => {
      const { id, priority } = action.payload;
      const node = state.nodes[id];
      
      if (node) {
        node.priority = priority;
        const updatedAt = createISODate();
        node.updatedAt = updatedAt;
        
        setTimeout(() => {
          TodoIndexedDBStorage.updateTodo(id, { priority, updatedAt }).catch(console.error);
        }, 0);
      }
    },




    selectNode: (state, action: PayloadAction<string>) => {
      const nodeId = action.payload;
      if (!state.selectedNodeIds.includes(nodeId)) {
        state.selectedNodeIds.push(nodeId);
      }
    },

    deselectNode: (state, action: PayloadAction<string>) => {
      const nodeId = action.payload;
      state.selectedNodeIds = state.selectedNodeIds.filter(id => id !== nodeId);
    },

    clearSelection: (state) => {
      state.selectedNodeIds = [];
    },

    startEditingTodo: (state, action: PayloadAction<string>) => {
      const nodeId = action.payload;
      if (state.nodes[nodeId]) {
        state.editingNodeId = nodeId;
      }
    },

    finishEditingTodo: (state, action: PayloadAction<string>) => {
      const nodeId = action.payload;
      if (state.editingNodeId === nodeId) {
        state.editingNodeId = null;
      }
    },

    bringToFront: (state, action: PayloadAction<string>) => {
      const node = state.nodes[action.payload];
      if (node) {
        const maxZIndex = Object.values(state.nodes).reduce((max, n) => 
          Math.max(max, n.zIndex || 0), 0
        );
        const zIndex = maxZIndex + 1;
        const updatedAt = createISODate();
        
        node.zIndex = zIndex;
        node.updatedAt = updatedAt;
        
        const nodeId = action.payload;
        
        setTimeout(() => {
          TodoIndexedDBStorage.updateTodo(nodeId, { zIndex, updatedAt }).catch(console.error);
        }, 0);
      }
    },

    sendToBack: (state, action: PayloadAction<string>) => {
      const node = state.nodes[action.payload];
      if (node) {
        const minZIndex = Object.values(state.nodes).reduce((min, n) => 
          Math.min(min, n.zIndex || 0), 0
        );
        const zIndex = Math.max(0, minZIndex - 1);
        const updatedAt = createISODate();
        
        node.zIndex = zIndex;
        node.updatedAt = updatedAt;
        
        const nodeId = action.payload;
        
        setTimeout(() => {
          TodoIndexedDBStorage.updateTodo(nodeId, { zIndex, updatedAt }).catch(console.error);
        }, 0);
      }
    },

    clearAllNodes: (state) => {
      const allNodeIds = Object.keys(state.nodes);
      state.nodes = {};
      state.selectedNodeIds = [];
      state.editingNodeId = null;
      
      if (allNodeIds.length > 0) {
        const allNodeIdsCopy = [...allNodeIds];
        setTimeout(() => {
          TodoIndexedDBStorage.deleteTodos(allNodeIdsCopy).catch(console.error);
        }, 0);
      }
    },

    restoreFromStorage: (state) => {
      try {
        const savedTodos = TodoStorage.loadTodos();
        state.nodes = savedTodos;
        state.selectedNodeIds = [];
        state.editingNodeId = null;
      } catch (error) {
        console.error('❌ Ошибка восстановления:', error);
      }
    },

    manualSave: (state) => {
      setTimeout(() => {
        saveState(state);
      }, 0);
    },

    importNodes: (state, action: PayloadAction<Record<string, Todo>>) => {
      state.nodes = { ...action.payload };
      state.selectedNodeIds = [];
      state.editingNodeId = null;
      
      const payloadCopy = { ...action.payload };
      const todosArray = Object.values(payloadCopy);
      if (todosArray.length > 0) {
        setTimeout(() => {
          TodoIndexedDBStorage.saveTodos(payloadCopy).catch(console.error);
        }, 0);
      }
    },

    exportNodes: (state) => {
      setTimeout(() => {
        try {
          const nodesToExport = JSON.parse(JSON.stringify(state.nodes));
          TodoStorage.exportToFile(nodesToExport);
        } catch (error) {
          console.error('❌ Ошибка экспорта:', error);
        }
      }, 0);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(deleteTodoFromDB.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteTodoFromDB.fulfilled, (state, action) => {
        const nodeId = action.payload;
        state.nodes = Object.fromEntries(
          Object.entries(state.nodes).filter(([id]) => id !== nodeId)
        );
        state.selectedNodeIds = state.selectedNodeIds.filter(id => id !== nodeId);
        if (state.editingNodeId === nodeId) {
          state.editingNodeId = null;
        }
        state.loading = false;
      })
      .addCase(deleteTodoFromDB.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Ошибка удаления задачи';
      })
      
      .addCase(deleteMultipleTodosFromDB.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteMultipleTodosFromDB.fulfilled, (state, action) => {
        const nodeIds = action.payload;
        state.nodes = Object.fromEntries(
          Object.entries(state.nodes).filter(([id]) => !nodeIds.includes(id))
        );
        state.selectedNodeIds = state.selectedNodeIds.filter(id => !nodeIds.includes(id));
        if (state.editingNodeId && nodeIds.includes(state.editingNodeId)) {
          state.editingNodeId = null;
        }
        state.loading = false;
      })
      .addCase(deleteMultipleTodosFromDB.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Ошибка массового удаления';
      })
      
      .addCase(loadTodosFromDB.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadTodosFromDB.fulfilled, (state, action) => {
        state.nodes = { ...action.payload };
        state.loading = false;
      })
      .addCase(loadTodosFromDB.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Ошибка загрузки задач';
      });
  },
});

export const {
  createTodo,
  createTodoAtPosition,
  createTodoForPage,
  moveTodoToPage,
  filterNodesByPage,
  deletePageNodes,
  duplicateTodo,
  updateTodo,
  updateTodoPartial,
  deleteTodo,
  deleteSelectedTodos,
  moveTodo,
  resizeTodo,
  setTodoStatus,
  setTodoPriority,
  addTodoTag,
  removeTodoTag,
  selectNode,
  deselectNode,
  clearSelection,
  startEditingTodo,
  finishEditingTodo,
  bringToFront,
  sendToBack,
  clearAllNodes,
  restoreFromStorage,
  manualSave,
  importNodes,
  exportNodes,
} = todoNodesSlice.actions;

export const todoNodesActions = todoNodesSlice.actions;

export default todoNodesSlice.reducer;