// src/shared/lib/state/store.ts
import { configureStore } from '@reduxjs/toolkit'

// Импорты редьюсеров
import todoNodesReducer from '@features/todo-nodes/model/slice'
import canvasDndReducer from '@features/canvas-dnd/model/slice'
import contextMenuReducer from '@features/node-creations/model/slice'
import todoFormReducer from '@features/todo-form/model/slice'
import { autoSaveMiddleware } from '@features/storage/model/autoSaveMiddleware';
// Создаем заглушки для отсутствующих редьюсеров
// TODO: Создайте реальные файлы для этих редьюсеров

// Заглушка для canvas-viewport
const canvasViewportReducer = (state = {
  transform: { x: 0, y: 0, zoom: 1 },
  isPanning: false,
}, action: any) => {
  switch (action.type) {
    default:
      return state
  }
}



// Заглушка для canvas-toolbar
const canvasToolbarReducer = (state = {
  activeTool: 'select',
  tools: [],
}, action: any) => {
  switch (action.type) {
    default:
      return state
  }
}

// Заглушка для properties-panel
const propertiesPanelReducer = (state = {
  isOpen: true,
  selectedNodeId: null,
  properties: {},
}, action: any) => {
  switch (action.type) {
    default:
      return state
  }
}

// Заглушка для selection (если используется отдельно)
const selectionReducer = (state = {
  selectedNodeIds: [],
  selectionRect: null,
}, action: any) => {
  switch (action.type) {
    default:
      return state
  }
}

// Заглушка для canvas-actions (если есть)
const canvasActionsReducer = (state = {
  history: [],
  currentAction: null,
}, action: any) => {
  switch (action.type) {
    default:
      return state
  }
}


// Единственный export store
export const store = configureStore({
  reducer: {
    todoNodes: todoNodesReducer,
    canvasDnd: canvasDndReducer,
    contextMenu: contextMenuReducer,
    todoForm: todoFormReducer,
    canvasViewport: canvasViewportReducer,
    canvasToolbar: canvasToolbarReducer,
    propertiesPanel: propertiesPanelReducer,
    selection: selectionReducer,
    canvasActions: canvasActionsReducer,
  },
  
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Для работы с Date и другими несериализуемыми типами
    }).concat(autoSaveMiddleware),

  devTools: process.env.NODE_ENV !== 'production',
})

// Типы
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch