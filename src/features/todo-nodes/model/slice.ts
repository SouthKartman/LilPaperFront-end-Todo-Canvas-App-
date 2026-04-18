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

// БЕЗОПАСНАЯ загрузка начального состояния
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

// 🆕 THUNK ДЛЯ УДАЛЕНИЯ ЗАДАЧИ ИЗ INDEXEDDB
export const deleteTodoFromDB = createAsyncThunk(
  'todoNodes/deleteFromDB',
  async (nodeId: string, { dispatch, getState, rejectWithValue }) => {
    try {
      // Получаем задачу из состояния БЕЗ использования прокси
      const state = getState() as any;
      const todo = state.todoNodes.nodes[nodeId];
      
      if (!todo) {
        console.warn(`Задача ${nodeId} не найдена в состоянии`);
        // Если задачи нет в состоянии, все равно пытаемся удалить из БД
        await TodoIndexedDBStorage.deleteTodo(nodeId);
        return nodeId;
      }
      
      // Удаляем из IndexedDB
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

// 🆕 THUNK ДЛЯ МАССОВОГО УДАЛЕНИЯ
export const deleteMultipleTodosFromDB = createAsyncThunk(
  'todoNodes/deleteMultipleFromDB',
  async (nodeIds: string[], { dispatch, rejectWithValue }) => {
    try {
      // Удаляем все задачи из БД
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

// 🆕 THUNK ДЛЯ СОХРАНЕНИЯ ЗАДАЧИ В INDEXEDDB
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

// 🆕 THUNK ДЛЯ ОБНОВЛЕНИЯ ЗАДАЧИ В INDEXEDDB
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

// 🆕 THUNK ДЛЯ ЗАГРУЗКИ ВСЕХ ЗАДАЧ ИЗ INDEXEDDB
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

// ФУНКЦИЯ ДЛЯ СОХРАНЕНИЯ В localStorage (для обратной совместимости)
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
    // Создание новой задачи
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
      
      // Асинхронно сохраняем в IndexedDB
      setTimeout(() => {
        TodoIndexedDBStorage.addTodo(newTodo).catch(console.error);
      }, 0);
    },

    // Создание задачи на определенной позиции
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
      
      // Асинхронно сохраняем в IndexedDB
      setTimeout(() => {
        TodoIndexedDBStorage.addTodo(newTodo).catch(console.error);
      }, 0);
    },

    // Создание задачи для конкретной страницы
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
      
      // Асинхронно сохраняем в IndexedDB
      setTimeout(() => {
        TodoIndexedDBStorage.addTodo(newTodo).catch(console.error);
      }, 0);
    },

    // Перенос ноды на другую страницу
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
        node.updatedAt = createISODate();
        
        // Асинхронно обновляем в IndexedDB
        setTimeout(() => {
          TodoIndexedDBStorage.updateTodo(nodeId, { pageId: targetPageId, updatedAt: node.updatedAt }).catch(console.error);
        }, 0);
      }
    },

    // Фильтрация нод по странице
    filterNodesByPage: (
      state, 
      action: PayloadAction<{
        pageId: string | null;
      }>
    ) => {
      // Этот экшен может использоваться для UI логики
      // Основная фильтрация происходит в селекторах
    },

    // Дублирование задачи
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
        
        // Асинхронно сохраняем копию в IndexedDB
        setTimeout(() => {
          TodoIndexedDBStorage.addTodo(newTodo).catch(console.error);
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
        
        Object.assign(node, {
          ...processedUpdates,
          updatedAt: createISODate(),
        });
        
        // Асинхронно обновляем в IndexedDB
        setTimeout(() => {
          TodoIndexedDBStorage.updateTodo(id, {
            ...processedUpdates,
            updatedAt: node.updatedAt,
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
        Object.assign(node, {
          ...updates,
          updatedAt: createISODate(),
        });
        
        // Асинхронно обновляем в IndexedDB
        setTimeout(() => {
          TodoIndexedDBStorage.updateTodo(id, {
            ...updates,
            updatedAt: node.updatedAt,
          }).catch(console.error);
        }, 0);
      }
    },

    deleteTodo: (state, action: PayloadAction<string>) => {
      const nodeId = action.payload;
      
      // Создаем копию, чтобы избежать проблем с прокси
      if (state.nodes[nodeId]) {
        delete state.nodes[nodeId];
      }
      
      state.selectedNodeIds = state.selectedNodeIds.filter(id => id !== nodeId);
      
      if (state.editingNodeId === nodeId) {
        state.editingNodeId = null;
      }
    },

    deleteSelectedTodos: (state) => {
      const selectedIds = [...state.selectedNodeIds];
      
      // Удаляем все выбранные ноды
      selectedIds.forEach(nodeId => {
        if (state.nodes[nodeId]) {
          delete state.nodes[nodeId];
        }
      });
      
      // Очищаем selection
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
        node.updatedAt = createISODate();
        
        // Асинхронно обновляем позицию в IndexedDB
        setTimeout(() => {
          TodoIndexedDBStorage.updateTodo(id, { position, updatedAt: node.updatedAt }).catch(console.error);
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
        node.updatedAt = createISODate();
        
        // Асинхронно обновляем размер в IndexedDB
        setTimeout(() => {
          TodoIndexedDBStorage.updateTodo(id, { size, updatedAt: node.updatedAt }).catch(console.error);
        }, 0);
      }
    },

    // Удаление всех нод страницы
    deletePageNodes: (
      state, 
      action: PayloadAction<{
        pageId: string;
      }>
    ) => {
      const { pageId } = action.payload;
      const nodesToDelete: string[] = [];
      
      // Собираем ID всех нод этой страницы
      Object.keys(state.nodes).forEach(nodeId => {
        if (state.nodes[nodeId].pageId === pageId) {
          nodesToDelete.push(nodeId);
          delete state.nodes[nodeId];
        }
      });
      
      // Очищаем selection
      state.selectedNodeIds = state.selectedNodeIds.filter(id => {
        const node = state.nodes[id];
        return node ? node.pageId !== pageId : true;
      });
      
      if (state.editingNodeId && state.nodes[state.editingNodeId]?.pageId === pageId) {
        state.editingNodeId = null;
      }
      
      // Асинхронно удаляем все ноды страницы из IndexedDB
      if (nodesToDelete.length > 0) {
        setTimeout(() => {
          TodoIndexedDBStorage.deleteTodos(nodesToDelete).catch(console.error);
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
        node.updatedAt = createISODate();
        
        // Асинхронно обновляем статус в IndexedDB
        setTimeout(() => {
          TodoIndexedDBStorage.updateTodo(id, { status, updatedAt: node.updatedAt }).catch(console.error);
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
        node.updatedAt = createISODate();
        
        // Асинхронно обновляем приоритет в IndexedDB
        setTimeout(() => {
          TodoIndexedDBStorage.updateTodo(id, { priority, updatedAt: node.updatedAt }).catch(console.error);
        }, 0);
      }
    },

    addTodoTag: (
      state, 
      action: PayloadAction<{
        id: string; 
        tag: string
      }>
    ) => {
      const { id, tag } = action.payload;
      const node = state.nodes[id];
      
      if (node && !node.tags.includes(tag)) {
        node.tags.push(tag);
        node.updatedAt = createISODate();
        
        // Асинхронно обновляем теги в IndexedDB
        setTimeout(() => {
          TodoIndexedDBStorage.updateTodo(id, { tags: node.tags, updatedAt: node.updatedAt }).catch(console.error);
        }, 0);
      }
    },

    removeTodoTag: (
      state, 
      action: PayloadAction<{
        id: string; 
        tag: string
      }>
    ) => {
      const { id, tag } = action.payload;
      const node = state.nodes[id];
      
      if (node) {
        node.tags = node.tags.filter(t => t !== tag);
        node.updatedAt = createISODate();
        
        // Асинхронно обновляем теги в IndexedDB
        setTimeout(() => {
          TodoIndexedDBStorage.updateTodo(id, { tags: node.tags, updatedAt: node.updatedAt }).catch(console.error);
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
        node.zIndex = maxZIndex + 1;
        node.updatedAt = createISODate();
        
        // Асинхронно обновляем zIndex в IndexedDB
        setTimeout(() => {
          TodoIndexedDBStorage.updateTodo(action.payload, { zIndex: node.zIndex, updatedAt: node.updatedAt }).catch(console.error);
        }, 0);
      }
    },

    sendToBack: (state, action: PayloadAction<string>) => {
      const node = state.nodes[action.payload];
      
      if (node) {
        const minZIndex = Object.values(state.nodes).reduce((min, n) => 
          Math.min(min, n.zIndex || 0), 0
        );
        node.zIndex = Math.max(0, minZIndex - 1);
        node.updatedAt = createISODate();
        
        // Асинхронно обновляем zIndex в IndexedDB
        setTimeout(() => {
          TodoIndexedDBStorage.updateTodo(action.payload, { zIndex: node.zIndex, updatedAt: node.updatedAt }).catch(console.error);
        }, 0);
      }
    },

    clearAllNodes: (state) => {
      const allNodeIds = Object.keys(state.nodes);
      
      state.nodes = {};
      state.selectedNodeIds = [];
      state.editingNodeId = null;
      
      // Асинхронно удаляем все задачи из IndexedDB
      if (allNodeIds.length > 0) {
        setTimeout(() => {
          TodoIndexedDBStorage.deleteTodos(allNodeIds).catch(console.error);
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
      state.nodes = action.payload;
      state.selectedNodeIds = [];
      state.editingNodeId = null;
      
      // Асинхронно сохраняем импортированные задачи в IndexedDB
      const todosArray = Object.values(action.payload);
      if (todosArray.length > 0) {
        setTimeout(() => {
          TodoIndexedDBStorage.saveTodos(action.payload).catch(console.error);
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
      // Удаление из БД
      .addCase(deleteTodoFromDB.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteTodoFromDB.fulfilled, (state, action) => {
        // Удаляем задачу из состояния
        const nodeId = action.payload;
        if (state.nodes[nodeId]) {
          delete state.nodes[nodeId];
        }
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
      
      // Массовое удаление
      .addCase(deleteMultipleTodosFromDB.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteMultipleTodosFromDB.fulfilled, (state, action) => {
        // Удаляем все задачи из состояния
        const nodeIds = action.payload;
        nodeIds.forEach(nodeId => {
          if (state.nodes[nodeId]) {
            delete state.nodes[nodeId];
          }
        });
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
      
      // Загрузка из БД
      .addCase(loadTodosFromDB.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadTodosFromDB.fulfilled, (state, action) => {
        state.nodes = action.payload;
        state.loading = false;
      })
      .addCase(loadTodosFromDB.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Ошибка загрузки задач';
      });
  },
});

// Экспорт всех actions
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