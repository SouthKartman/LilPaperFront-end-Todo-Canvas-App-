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
  // Проверяем, что мы в браузере (не SSR)
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

// ФУНКЦИЯ ДЛЯ СОХРАНЕНИЯ - КОНВЕРТИРУЕМ PROXY В ОБЫЧНЫЙ ОБЪЕКТ
const saveState = (state: TodoNodesState) => {
  // Важно: конвертируем proxy Immer в обычный объект
  try {
    // Способ 1: Используем JSON.stringify/parse для глубокого копирования
    const nodesToSave = JSON.parse(JSON.stringify(state.nodes));
    TodoStorage.saveTodos(nodesToSave);
  } catch (error) {
    console.error('❌ Ошибка автосохранения:', error);
    
    // Способ 2: Ручное копирование как fallback
    try {
      const manualCopy: Record<string, Todo> = {};
      for (const [key, value] of Object.entries(state.nodes)) {
        if (value && typeof value === 'object') {
          manualCopy[key] = { ...value };
        }
      }
      TodoStorage.saveTodos(manualCopy);
    } catch (fallbackError) {
      console.error('❌ Ошибка и в fallback сохранении:', fallbackError);
    }
  }
};

// АВТОСОХРАНЕНИЕ С ЗАЩИТОЙ ОТ PROXY
const autoSave = (state: TodoNodesState) => {
  // Используем setTimeout чтобы дать Redux завершить обновление состояния
  // и избежать работы с уже отозванным proxy
  setTimeout(() => {
    saveState(state);
  }, 0);
};

// МИДЛВАРЕ ДЛЯ АВТОСОХРАНЕНИЯ (опционально, но надежнее)
export const createAutoSaveMiddleware = () => (store: any) => (next: any) => (action: any) => {
  const result = next(action);
  
  // Сохраняем только после определенных действий
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
  ];
  
  if (saveActions.includes(action.type)) {
    // Используем setTimeout чтобы состояние уже обновилось
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
    createTodo: (state, action: PayloadAction<CreateTodoDto>) => {
      const id = nanoid();
      const now = createISODate();
      const payload = action.payload;
      
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
      }>
    ) => {
      const id = nanoid();
      const now = createISODate();
      const { position, title = 'Новая задача', priority = 'medium' } = action.payload;
      
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
        size: { width: 280, height: 180 },
      };
      
      state.nodes[id] = newTodo;
      state.selectedNodeIds = [id];
      state.editingNodeId = id;
    },

    // Дублирование задачи
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
        };
        
        state.selectedNodeIds = [id];
        state.editingNodeId = null;
      }
    },

    // Обновление задачи
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

    // Частичное обновление
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

    // Удаление задачи
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

    // Удаление выделенных задач
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

    // Перемещение задачи
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

    // Изменение размера
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

    // Установка статуса
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

    // Установка приоритета
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

    // Добавление тега
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

    // Удаление тега
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

    // Выделение/снятие выделения
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

    // Управление редактированием
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

    // Z-index операции
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

    // Управление хранилищем
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
      // Ручное сохранение тоже использует безопасную функцию
      setTimeout(() => {
        saveState(state);
      }, 0);
    },

    // Импорт/экспорт
    importNodes: (state, action: PayloadAction<Record<string, Todo>>) => {
      state.nodes = action.payload;
      state.selectedNodeIds = [];
      state.editingNodeId = null;
    },

    exportNodes: (state) => {
      // Экспорт происходит через компонент
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

// Экспорт всех actions
export const {
  createTodo,
  createTodoAtPosition,
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

// Экспорт для удобного использования
export const todoNodesActions = todoNodesSlice.actions;

export default todoNodesSlice.reducer;