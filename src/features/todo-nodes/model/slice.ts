// src/features/todo-nodes/model/slice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { CreateTodoDto, UpdateTodoDto } from '@entities/todo/model/types'
import { nanoid } from 'nanoid'

export interface TodoNode {
  id: string
  title: string
  description: string
  status: 'todo' | 'in-progress' | 'done' | 'blocked'
  priority: 'low' | 'medium' | 'high' | 'critical'
  createdAt: Date
  updatedAt: Date
  dueDate?: Date
  tags: string[]
  parentId?: string
  assignee?: string
  position: {
    x: number
    y: number
  }
  size: {
    width: number
    height: number
  }
  // Добавленные поля для работы с канвасом
  zIndex?: number
  isEditing?: boolean
  type?: 'default' | 'checklist' | 'note' | 'urgent'
}

interface TodoNodesState {
  nodes: Record<string, TodoNode>
  selectedNodeIds: string[]
  // Добавленное поле для редактирования
  editingNodeId: string | null
}

const initialState: TodoNodesState = {
  nodes: {},
  selectedNodeIds: [],
  editingNodeId: null,
}

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
    },
    
    // Новый action для создания через контекстное меню
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
        isEditing: true, // Автоматически начинаем редактирование
        type,
      }
      
      // Выделяем созданную ноду
      state.selectedNodeIds = [id]
      state.editingNodeId = id
    },
    
    // Новый action для дублирования ноды
    duplicateTodo: (state, action: PayloadAction<string>) => {
      const originalId = action.payload
      const originalNode = state.nodes[originalId]
      
      if (originalNode) {
        const id = nanoid()
        const now = new Date()
        
        // Создаем копию со смещением позиции
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
        
        // Выделяем новую ноду
        state.selectedNodeIds = [id]
        state.editingNodeId = null
      }
    },
    
    // Новый action для начала редактирования
    startEditingTodo: (state, action: PayloadAction<string>) => {
      const nodeId = action.payload
      if (state.nodes[nodeId]) {
        state.editingNodeId = nodeId
        state.nodes[nodeId].isEditing = true
      }
    },
    
    // Новый action для завершения редактирования
    finishEditingTodo: (state, action: PayloadAction<string>) => {
      const nodeId = action.payload
      if (state.nodes[nodeId]) {
        state.editingNodeId = null
        state.nodes[nodeId].isEditing = false
      }
    },
    
    updateTodo: (state, action: PayloadAction<UpdateTodoDto>) => {
      const { id, ...updates } = action.payload
      const node = state.nodes[id]
      if (node) {
        Object.assign(node, { 
          ...updates, 
          updatedAt: new Date(),
          isEditing: false, // Завершаем редактирование при обновлении
        })
        state.editingNodeId = null
      }
    },
    
    // Новый action для частичного обновления
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
      }
    },
    
    deleteTodo: (state, action: PayloadAction<string>) => {
      const nodeId = action.payload
      delete state.nodes[nodeId]
      state.selectedNodeIds = state.selectedNodeIds.filter(
        selectedId => selectedId !== nodeId
      )
      
      // Если удаляем редактируемую ноду, сбрасываем editingNodeId
      if (state.editingNodeId === nodeId) {
        state.editingNodeId = null
      }
    },
    
    // Новый action для удаления нескольких нод
    deleteSelectedTodos: (state) => {
      state.selectedNodeIds.forEach(nodeId => {
        delete state.nodes[nodeId]
      })
      
      // Если среди удаленных была редактируемая нода
      if (state.editingNodeId && state.selectedNodeIds.includes(state.editingNodeId)) {
        state.editingNodeId = null
      }
      
      state.selectedNodeIds = []
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
    
    // Новый action для перемещения ноды
    moveTodo: (
      state, 
      action: PayloadAction<{id: string; position: { x: number; y: number }}>
    ) => {
      const { id, position } = action.payload
      const node = state.nodes[id]
      if (node) {
        node.position = position
        node.updatedAt = new Date()
      }
    },
    
    // Новый action для изменения размера ноды
    resizeTodo: (
      state, 
      action: PayloadAction<{id: string; size: { width: number; height: number }}>
    ) => {
      const { id, size } = action.payload
      const node = state.nodes[id]
      if (node) {
        node.size = size
        node.updatedAt = new Date()
      }
    },
    
    // Новый action для изменения z-index
    bringToFront: (state, action: PayloadAction<string>) => {
      const node = state.nodes[action.payload]
      if (node) {
        // Находим максимальный zIndex среди всех нод
        const maxZIndex = Object.values(state.nodes)
          .reduce((max, n) => Math.max(max, n.zIndex || 1), 1)
        node.zIndex = maxZIndex + 1
        node.updatedAt = new Date()
      }
    },
    
    sendToBack: (state, action: PayloadAction<string>) => {
      const node = state.nodes[action.payload]
      if (node) {
        // Находим минимальный zIndex среди всех нод
        const minZIndex = Object.values(state.nodes)
          .reduce((min, n) => Math.min(min, n.zIndex || 1), 1)
        node.zIndex = Math.max(1, minZIndex - 1)
        node.updatedAt = new Date()
      }
    },
    
    // Новый action для установки приоритета
    setTodoPriority: (
      state, 
      action: PayloadAction<{id: string; priority: TodoNode['priority']}>
    ) => {
      const { id, priority } = action.payload
      const node = state.nodes[id]
      if (node) {
        node.priority = priority
        node.updatedAt = new Date()
      }
    },
    
    // Новый action для установки статуса
    setTodoStatus: (
      state, 
      action: PayloadAction<{id: string; status: TodoNode['status']}>
    ) => {
      const { id, status } = action.payload
      const node = state.nodes[id]
      if (node) {
        node.status = status
        node.updatedAt = new Date()
      }
    },
    
    // Новый action для добавления тега
    addTodoTag: (
      state, 
      action: PayloadAction<{id: string; tag: string}>
    ) => {
      const { id, tag } = action.payload
      const node = state.nodes[id]
      if (node && !node.tags.includes(tag)) {
        node.tags.push(tag)
        node.updatedAt = new Date()
      }
    },
    
    // Новый action для удаления тега
    removeTodoTag: (
      state, 
      action: PayloadAction<{id: string; tag: string}>
    ) => {
      const { id, tag } = action.payload
      const node = state.nodes[id]
      if (node) {
        node.tags = node.tags.filter(t => t !== tag)
        node.updatedAt = new Date()
      }
    },
  },
})

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
} = todoNodesSlice.actions



// В конце файла slice.ts, после всех actions, добавьте:
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
}

export default todoNodesSlice.reducer