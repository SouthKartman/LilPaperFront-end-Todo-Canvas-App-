// src/features/todo-nodes/model/slice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
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

export interface TodoNodesState {
  nodes: Record<string, Todo>;
  selectedNodeIds: string[];
  editingNodeId: string | null;
}

// БЕЗОПАСНАЯ загрузка начального состояния
const loadInitialState = (): TodoNodesState => {
  if (typeof window === 'undefined') {
    return {
      nodes: {},
      selectedNodeIds: [],
      editingNodeId: null,
    };
  }

  try {
    const savedTodos = TodoStorage.loadTodos();
    console.log('📂 Загружено задач из хранилища:', Object.keys(savedTodos).length);
    
    return {
      nodes: savedTodos,
      selectedNodeIds: [],
      editingNodeId: null,
    };
  } catch (error) {
    console.error('❌ Ошибка загрузки из хранилища:', error);
    return {
      nodes: {},
      selectedNodeIds: [],
      editingNodeId: null,
    };
  }
};

const initialState: TodoNodesState = loadInitialState();

// 🆕 НОВАЯ ФУНКЦИЯ: Получаем текущую страницу из проекта
const getCurrentPageId = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const projectState = localStorage.getItem('project_state');
    if (projectState) {
      const parsed = JSON.parse(projectState);
      const currentProject = parsed.projects[parsed.currentProjectId];
      return currentProject?.currentPageId || null;
    }
  } catch (error) {
    console.error('❌ Ошибка получения текущей страницы:', error);
  }
  return null;
};

// ФУНКЦИЯ ДЛЯ СОХРАНЕНИЯ
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
    'todoNodes/deleteTodo',
    'todoNodes/moveTodo',
    'todoNodes/setTodoStatus',
    'todoNodes/setTodoPriority',
    'todoNodes/clearAllNodes',
    'todoNodes/importNodes',
    'todoNodes/duplicateTodo',
    'todoNodes/deleteSelectedTodos',
    'project/addPage', // 🆕 ДОБАВЛЕНО
    'project/switchPage', // 🆕 ДОБАВЛЕНО
    'project/removePage', // 🆕 ДОБАВЛЕНО
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
      const currentPageId = getCurrentPageId();
      
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
        pageId: payload.pageId || currentPageId || 'default_page', // 🆕 ДОБАВЛЕНО
      };
      
      state.nodes[id] = newTodo;
    },

    // Создание задачи на определенной позиции
    createTodoAtPosition: (
      state, 
      action: PayloadAction<{
        position: { x: number; y: number };
        title?: string;
        priority?: TodoPriority;
        pageId?: string; // 🆕 ДОБАВЛЕНО
      }>
    ) => {
      const id = nanoid();
      const now = createISODate();
      const { position, title = 'Новая задача', priority = 'medium', pageId } = action.payload;
      const currentPageId = getCurrentPageId();
      
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
        pageId: pageId || currentPageId || 'default_page', // 🆕 ДОБАВЛЕНО
      };
      
      state.nodes[id] = newTodo;
      state.selectedNodeIds = [id];
      state.editingNodeId = id;
    },

    // 🆕 НОВЫЙ ЭКШЕН: Создание задачи для конкретной страницы
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
        pageId, // 🆕 ЯВНО УКАЗЫВАЕМ pageId
      };
      
      state.nodes[id] = newTodo;
      state.selectedNodeIds = [id];
      state.editingNodeId = id;
    },

    // 🆕 НОВЫЙ ЭКШЕН: Перенос ноды на другую страницу
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
      }
    },

    // 🆕 НОВЫЙ ЭКШЕН: Фильтрация нод по странице
    filterNodesByPage: (
      state, 
      action: PayloadAction<{
        pageId: string | null; // null = все страницы
      }>
    ) => {
      // Этот экшен может использоваться для UI логики
      // Основная фильтрация происходит в селекторах
    },

    // Дублирование задачи (с сохранением pageId)
    duplicateTodo: (state, action: PayloadAction<string>) => {
      const originalId = action.payload;
      const originalNode = state.nodes[originalId];
      
      if (originalNode) {
        const id = nanoid();
        const now = createISODate();
        
        state.nodes[id] = {
          ...originalNode,
          id,
          title: `${originalNode.title} (копия)`,
          position: {
            x: originalNode.position.x + 20,
            y: originalNode.position.y + 20,
          },
          createdAt: now,
          updatedAt: now,
          pageId: originalNode.pageId, // 🆕 СОХРАНЯЕМ pageId
        };
        
        state.selectedNodeIds = [id];
        state.editingNodeId = null;
      }
    },

    // Остальные экшены остаются без изменений, но добавляем pageId в типы при необходимости
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
      }
    },

    deleteTodo: (state, action: PayloadAction<string>) => {
      const nodeId = action.payload;
      const node = state.nodes[nodeId];
      
      if (node) {
        delete state.nodes[nodeId];
        state.selectedNodeIds = state.selectedNodeIds.filter(id => id !== nodeId);
        
        if (state.editingNodeId === nodeId) {
          state.editingNodeId = null;
        }
      }
    },

    deleteSelectedTodos: (state) => {
      const selectedIds = [...state.selectedNodeIds];
      
      selectedIds.forEach(nodeId => {
        delete state.nodes[nodeId];
      });
      
      if (state.editingNodeId && selectedIds.includes(state.editingNodeId)) {
        state.editingNodeId = null;
      }
      
      state.selectedNodeIds = [];
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
      }
    },

    // 🆕 НОВЫЙ ЭКШЕН: Удаление всех нод страницы
    deletePageNodes: (
      state, 
      action: PayloadAction<{
        pageId: string;
      }>
    ) => {
      const { pageId } = action.payload;
      
      // Удаляем все ноды этой страницы
      Object.keys(state.nodes).forEach(nodeId => {
        if (state.nodes[nodeId].pageId === pageId) {
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
    },

    // Остальные экшены без изменений...
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
      }
    },

    clearAllNodes: (state) => {
      state.nodes = {};
      state.selectedNodeIds = [];
      state.editingNodeId = null;
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
});

// Экспорт всех actions с новыми
export const {
  createTodo,
  createTodoAtPosition,
  createTodoForPage, // 🆕 НОВЫЙ
  moveTodoToPage, // 🆕 НОВЫЙ
  filterNodesByPage, // 🆕 НОВЫЙ
  deletePageNodes, // 🆕 НОВЫЙ
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