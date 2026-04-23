// src/features/selection/model/slice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { SelectionState } from './types'

const initialState: SelectionState = {
  selectedTodoIds: [],
  selectedImageIds: [],
    marquee: {
    isActive: false,
    startPoint: null,
    endPoint: null,
  },
}

export const selectionSlice = createSlice({
  name: 'selection',
  initialState,
  reducers: {
    // Выделить одну задачу
    selectTodo: (state, action: PayloadAction<string>) => {
      if (!state.selectedTodoIds.includes(action.payload)) {
        state.selectedTodoIds.push(action.payload)
      }
    },
    
    // Снять выделение с задачи
    deselectTodo: (state, action: PayloadAction<string>) => {
      state.selectedTodoIds = state.selectedTodoIds.filter(id => id !== action.payload)
    },
    
    // Выделить несколько задач
    selectMultipleTodos: (state, action: PayloadAction<string[]>) => {
      action.payload.forEach(id => {
        if (!state.selectedTodoIds.includes(id)) {
          state.selectedTodoIds.push(id)
        }
      })
    },

    // Прямоугольник выделения
    
    startMarquee: (state, action: PayloadAction<{ x: number; y: number }>) => {
      state.marquee.isActive = true
      state.marquee.startPoint = action.payload
      state.marquee.endPoint = action.payload
    },

    updateMarquee: (state, action: PayloadAction<{ x: number; y: number }>) => {
      if (state.marquee.isActive) {
        state.marquee.endPoint = action.payload
      }
    },

    endMarquee: (state) => {
      state.marquee.isActive = false
      state.marquee.startPoint = null
      state.marquee.endPoint = null
    },

    // Выделить ноды внутри прямоугольника
    selectNodesInRect: (state, action: PayloadAction<{
      todoIds: string[]
      imageIds: string[]
    }>) => {
      state.selectedTodoIds = action.payload.todoIds
      state.selectedImageIds = action.payload.imageIds
    },
    
    // Очистить выделение задач
    clearTodoSelection: (state) => {
      state.selectedTodoIds = []
    },
    
    // Выделить одно изображение
    selectImage: (state, action: PayloadAction<string>) => {
      if (!state.selectedImageIds.includes(action.payload)) {
        state.selectedImageIds.push(action.payload)
      }
    },
    
    // Снять выделение с изображения
    deselectImage: (state, action: PayloadAction<string>) => {
      state.selectedImageIds = state.selectedImageIds.filter(id => id !== action.payload)
    },
    
    // Выделить несколько изображений
    selectMultipleImages: (state, action: PayloadAction<string[]>) => {
      action.payload.forEach(id => {
        if (!state.selectedImageIds.includes(id)) {
          state.selectedImageIds.push(id)
        }
      })
    },
    
    // Очистить выделение изображений
    clearImageSelection: (state) => {
      state.selectedImageIds = []
    },
    
    // Очистить всё выделение
    clearAllSelection: (state) => {
      state.selectedTodoIds = []
      state.selectedImageIds = []
    },
    
    // Установить выделение (заменяет текущее)
    setTodoSelection: (state, action: PayloadAction<string[]>) => {
      state.selectedTodoIds = action.payload
    },
    
    setImageSelection: (state, action: PayloadAction<string[]>) => {
      state.selectedImageIds = action.payload
    },
  },
})

export const {
  selectTodo,
  deselectTodo,
  selectMultipleTodos,
  clearTodoSelection,
  selectImage,
  deselectImage,
  selectMultipleImages,
  clearImageSelection,
  clearAllSelection,
  setTodoSelection,
  setImageSelection,
  
  startMarquee,
  updateMarquee,
  endMarquee,
  selectNodesInRect,
} = selectionSlice.actions

export default selectionSlice.reducer