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
}

interface TodoNodesState {
  nodes: Record<string, TodoNode>
  selectedNodeIds: string[]
}

const initialState: TodoNodesState = {
  nodes: {},
  selectedNodeIds: [],
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
      }
    },
    
    updateTodo: (state, action: PayloadAction<UpdateTodoDto>) => {
      const { id, ...updates } = action.payload
      const node = state.nodes[id]
      if (node) {
        Object.assign(node, { ...updates, updatedAt: new Date() })
      }
    },
    
    deleteTodo: (state, action: PayloadAction<string>) => {
      delete state.nodes[action.payload]
      state.selectedNodeIds = state.selectedNodeIds.filter(
        nodeId => nodeId !== action.payload
      )
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
  },
})

export const {
  createTodo,
  updateTodo,
  deleteTodo,
  selectNode,
  deselectNode,
  clearSelection,
} = todoNodesSlice.actions

export default todoNodesSlice.reducer