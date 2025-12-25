// src/features/todo-nodes/model/slice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CreateTodoDto, UpdateTodoDto } from '@entities/todo/model/types';
import { nanoid } from 'nanoid';
import { TodoStorage } from '../../../shared/api/storage/jsonStorage/todoStorage';
import { TodoNodesState } from './types';

// ... ваш существующий код с интерфейсами ...

// Загружаем начальное состояние из localStorage
const savedNodes = TodoStorage.loadNodes();

const initialState: TodoNodesState = {
  nodes: savedNodes,
  selectedNodeIds: [],
  editingNodeId: null,
};

// Вспомогательная функция для автосохранения
const saveState = (state: TodoNodesState) => {
  // Используем setTimeout для асинхронного сохранения без блокировки UI
  setTimeout(() => {
    TodoStorage.saveNodes(state.nodes);
  }, 0);
};

export const todoNodesSlice = createSlice({
  name: 'todoNodes',
  initialState,
  reducers: {
    createTodo: (state, action: PayloadAction<CreateTodoDto>) => {
      const id = nanoid()
      const now = new Date()
      
      state.nodes[id] = {
        id,
        title: action.payload.title,
        description: action.payload.description || '',
        status: action.payload.status || 'todo',
        priority: action.payload.priority || 'medium',
        createdAt: now,
        updatedAt: now,
        dueDate: action.payload.dueDate,
        tags: action.payload.tags || [],
        parentId: action.payload.parentId,
        assignee: undefined,
        position: action.payload.position || { x: 100, y: 100 },
        size: { width: 200, height: 150 },
        zIndex: 1,
        isEditing: false,
        type: action.payload.type || 'default',
      }
      
      // Автосохранение
      saveState(state);
    },
    
    createTodoAtPosition: (
      state, 
      action: PayloadAction<{
        position: { x: number; y: number }
        type?: TodoNode['type']
        title?: string
        priority?: TodoNode['priority']
      }>
    ) => {
      const id = nanoid()
      const now = new Date()
      const { position, type = 'default', title = 'Новая задача', priority = 'medium' } = action.payload
      
      state.nodes[id] = {
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
        zIndex: 1,
        isEditing: true,
        type,
      }
      
      state.selectedNodeIds = [id]
      state.editingNodeId = id
      
      // Автосохранение
      saveState(state);
    },
    
    duplicateTodo: (state, action: PayloadAction<string>) => {
      const originalId = action.payload
      const originalNode = state.nodes[originalId]
      
      if (originalNode) {
        const id = nanoid()
        const now = new Date()
        
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
          isEditing: false,
        }
        
        state.selectedNodeIds = [id]
        state.editingNodeId = null
        
        // Автосохранение
        saveState(state);
      }
    },
    
    startEditingTodo: (state, action: PayloadAction<string>) => {
      const nodeId = action.payload
      if (state.nodes[nodeId]) {
        state.editingNodeId = nodeId
        state.nodes[nodeId].isEditing = true
      }
    },
    
    finishEditingTodo: (state, action: PayloadAction<string>) => {
      const nodeId = action.payload
      if (state.nodes[nodeId]) {
        state.editingNodeId = null
        state.nodes[nodeId].isEditing = false
        
        // Автосохранение при завершении редактирования
        saveState(state);
      }
    },
    
    updateTodo: (state, action: PayloadAction<UpdateTodoDto>) => {
      const { id, ...updates } = action.payload
      const node = state.nodes[id]
      if (node) {
        Object.assign(node, { 
          ...updates, 
          updatedAt: new Date(),
          isEditing: false,
        })
        state.editingNodeId = null
        
        // Автосохранение
        saveState(state);
      }
    },
    
    updateTodoPartial: (
      state, 
      action: PayloadAction<{id: string; updates: Partial<TodoNode>}>
    ) => {
      const { id, updates } = action.payload
      const node = state.nodes[id]
      if (node) {
        Object.assign(node, { 
          ...updates, 
          updatedAt: new Date() 
        })
        
        // Автосохранение
        saveState(state);
      }
    },
    
    deleteTodo: (state, action: PayloadAction<string>) => {
      const nodeId = action.payload
      delete state.nodes[nodeId]
      state.selectedNodeIds = state.selectedNodeIds.filter(
        selectedId => selectedId !== nodeId
      )
      
      if (state.editingNodeId === nodeId) {
        state.editingNodeId = null
      }
      
      // Автосохранение
      saveState(state);
    },
    
    deleteSelectedTodos: (state) => {
      state.selectedNodeIds.forEach(nodeId => {
        delete state.nodes[nodeId]
      })
      
      if (state.editingNodeId && state.selectedNodeIds.includes(state.editingNodeId)) {
        state.editingNodeId = null
      }
      
      state.selectedNodeIds = []
      
      // Автосохранение
      saveState(state);
    },
    
    selectNode: (state, action: PayloadAction<string>) => {
      if (!state.selectedNodeIds.includes(action.payload)) {
        state.selectedNodeIds.push(action.payload)
      }
    },
    
    deselectNode: (state, action: PayloadAction<string>) => {
      state.selectedNodeIds = state.selectedNodeIds.filter(
        nodeId => nodeId !== action.payload
      )
    },
    
    clearSelection: (state) => {
      state.selectedNodeIds = []
    },
    
    moveTodo: (
      state, 
      action: PayloadAction<{id: string; position: { x: number; y: number }}>
    ) => {
      const { id, position } = action.payload
      const node = state.nodes[id]
      if (node) {
        node.position = position
        node.updatedAt = new Date()
        
        // Автосохранение при перемещении
        saveState(state);
      }
    },
    
    resizeTodo: (
      state, 
      action: PayloadAction<{id: string; size: { width: number; height: number }}>
    ) => {
      const { id, size } = action.payload
      const node = state.nodes[id]
      if (node) {
        node.size = size
        node.updatedAt = new Date()
        
        // Автосохранение при изменении размера
        saveState(state);
      }
    },
    
    bringToFront: (state, action: PayloadAction<string>) => {
      const node = state.nodes[action.payload]
      if (node) {
        const maxZIndex = Object.values(state.nodes)
          .reduce((max, n) => Math.max(max, n.zIndex || 1), 1)
        node.zIndex = maxZIndex + 1
        node.updatedAt = new Date()
        
        // Автосохранение
        saveState(state);
      }
    },
    
    sendToBack: (state, action: PayloadAction<string>) => {
      const node = state.nodes[action.payload]
      if (node) {
        const minZIndex = Object.values(state.nodes)
          .reduce((min, n) => Math.min(min, n.zIndex || 1), 1)
        node.zIndex = Math.max(1, minZIndex - 1)
        node.updatedAt = new Date()
        
        // Автосохранение
        saveState(state);
      }
    },
    
    setTodoPriority: (
      state, 
      action: PayloadAction<{id: string; priority: TodoNode['priority']}>
    ) => {
      const { id, priority } = action.payload
      const node = state.nodes[id]
      if (node) {
        node.priority = priority
        node.updatedAt = new Date()
        
        // Автосохранение
        saveState(state);
      }
    },
    
    setTodoStatus: (
      state, 
      action: PayloadAction<{id: string; status: TodoNode['status']}>
    ) => {
      const { id, status } = action.payload
      const node = state.nodes[id]
      if (node) {
        node.status = status
        node.updatedAt = new Date()
        
        // Автосохранение
        saveState(state);
      }
    },
    
    addTodoTag: (
      state, 
      action: PayloadAction<{id: string; tag: string}>
    ) => {
      const { id, tag } = action.payload
      const node = state.nodes[id]
      if (node && !node.tags.includes(tag)) {
        node.tags.push(tag)
        node.updatedAt = new Date()
        
        // Автосохранение
        saveState(state);
      }
    },
    
    removeTodoTag: (
      state, 
      action: PayloadAction<{id: string; tag: string}>
    ) => {
      const { id, tag } = action.payload
      const node = state.nodes[id]
      if (node) {
        node.tags = node.tags.filter(t => t !== tag)
        node.updatedAt = new Date()
        
        // Автосохранение
        saveState(state);
      }
    },
    
    // НОВЫЕ ACTIONS ДЛЯ УПРАВЛЕНИЯ ХРАНИЛИЩЕМ
    
    /**
     * Импортировать ноды из файла
     */
    importNodes: (state, action: PayloadAction<Record<string, TodoNode>>) => {
      state.nodes = action.payload;
      state.selectedNodeIds = [];
      state.editingNodeId = null;
      
      // Сохраняем импортированные данные
      saveState(state);
    },
    
    /**
     * Экспортировать ноды в файл
     */
    exportNodes: (state) => {
      // Экспорт происходит через компонент, здесь только триггер
      TodoStorage.exportToFile(state.nodes);
    },
    
    /**
     * Очистить все ноды и хранилище
     */
    clearAllNodes: (state) => {
      state.nodes = {};
      state.selectedNodeIds = [];
      state.editingNodeId = null;
      
      // Очищаем хранилище
      TodoStorage.clearAll();
    },
    
    /**
     * Восстановить из последней сохраненной версии
     */
    restoreFromStorage: (state) => {
      const savedNodes = TodoStorage.loadNodes();
      state.nodes = savedNodes;
      state.selectedNodeIds = [];
      state.editingNodeId = null;
    },
    
    /**
     * Сохранить состояние вручную (например, перед закрытием)
     */
    manualSave: (state) => {
      TodoStorage.saveNodes(state.nodes);
    },
  },
});

// ... остальной код экспортов ...

// Добавьте новые actions в экспорт
export const {
  createTodo,
  createTodoAtPosition,
  updateTodo,
  updateTodoPartial,
  deleteTodo,
  deleteSelectedTodos,
  selectNode,
  deselectNode,
  clearSelection,
  startEditingTodo,
  finishEditingTodo,
  duplicateTodo,
  moveTodo,
  resizeTodo,
  bringToFront,
  sendToBack,
  setTodoPriority,
  setTodoStatus,
  addTodoTag,
  removeTodoTag,
  // Новые actions для хранилища
  importNodes,
  exportNodes,
  clearAllNodes,
  restoreFromStorage,
  manualSave,
} = todoNodesSlice.actions;

// Обновите todoNodesActions
export const todoNodesActions = {
  createTodo,
  createTodoAtPosition,
  updateTodo,
  updateTodoPartial,
  deleteTodo,
  deleteSelectedTodos,
  selectNode,
  deselectNode,
  clearSelection,
  startEditingTodo,
  finishEditingTodo,
  duplicateTodo,
  moveTodo,
  resizeTodo,
  bringToFront,
  sendToBack,
  setTodoPriority,
  setTodoStatus,
  addTodoTag,
  removeTodoTag,
  importNodes,
  exportNodes,
  clearAllNodes,
  restoreFromStorage,
  manualSave,
};

export default todoNodesSlice.reducer;