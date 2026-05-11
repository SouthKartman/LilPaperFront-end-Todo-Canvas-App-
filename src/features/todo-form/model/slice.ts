// src/features/todo-form/model/slice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface TodoFormData {
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'todo' | 'in-progress' | 'done' | 'blocked'
  tags: string[]
  dueDate?: Date
  assignee?: string
  type: 'default' | 'checklist' | 'note' | 'urgent'
}

export interface TodoFormState {
  isOpen: boolean
  isQuickFormOpen: boolean
  formData: TodoFormData
  position?: { x: number; y: number }
}

const initialFormData: TodoFormData = {
  title: '',
  description: '',
  priority: 'medium',
  status: 'todo',
  tags: [],
  type: 'default',
}

const initialState: TodoFormState = {
  isOpen: false,
  isQuickFormOpen: false,
  formData: initialFormData,
  position: undefined,
}

export const todoFormSlice = createSlice({
  name: 'todoForm',
  initialState,
  reducers: {
    openForm: (state, action: PayloadAction<{ position?: { x: number; y: number } }>) => {
      console.log('Reducer: openForm', action.payload)
      state.isOpen = true
      state.position = action.payload.position
    },
    
    openQuickForm: (state, action: PayloadAction<{ position: { x: number; y: number } }>) => {
      console.log('Reducer: openQuickForm', action.payload)
      state.isQuickFormOpen = true
      state.position = action.payload.position
      state.formData = { ...initialFormData, title: 'Новая задача' }
    },
    
    closeForm: (state) => {
      console.log('Reducer: closeForm')
      state.isOpen = false
      state.isQuickFormOpen = false
      state.formData = initialFormData
      state.position = undefined
    },
    
    updateFormData: (state, action: PayloadAction<Partial<TodoFormData>>) => {
      state.formData = { ...state.formData, ...action.payload }
    },
    
    resetForm: (state) => {
      state.formData = initialFormData
    },
  },
})

export const {
  openForm,
  openQuickForm,
  closeForm,
  updateFormData,
  resetForm,
} = todoFormSlice.actions

export default todoFormSlice.reducer