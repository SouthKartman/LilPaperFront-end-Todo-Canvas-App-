import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import type { TypedUseSelectorHook } from 'react-redux'

// Импорты редьюсеров
import todoNodesReducer from '@features/todo-nodes/model/slice'
import canvasDndReducer from '@features/canvas-dnd/model/slice'
import contextMenuReducer from '@features/node-creations/model/slice'
import todoFormReducer from '@features/todo-form/model/slice'
import viewportReducer from '@features/canvas-viewport/model/slice' // ← ДОБАВЛЕНО
import { autoSaveMiddleware } from '@features/storage/model/autoSaveMiddleware';

// Создаем заглушки для отсутствующих редьюсеров
// TODO: Создайте реальные файлы для этих редьюсеров

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

// Создаем корневой редьюсер для лучшей типизации
const rootReducer = combineReducers({
  todoNodes: todoNodesReducer,
  canvasDnd: canvasDndReducer,
  contextMenu: contextMenuReducer,
  todoForm: todoFormReducer,
  viewport: viewportReducer, // ← ВМЕСТО canvasViewport
  canvasToolbar: canvasToolbarReducer,
  propertiesPanel: propertiesPanelReducer,
  selection: selectionReducer,
  canvasActions: canvasActionsReducer,
})

// Единственный export store
export const store = configureStore({
  reducer: rootReducer,
  
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Игнорируем несериализуемые поля в viewport
        ignoredActions: [
          'viewport/zoomToPoint', 
          'viewport/zoomIn', 
          'viewport/zoomOut'
        ],
        ignoredPaths: [
          'viewport.lastZoomPoint',
          'todoNodes.nodes',
        ],
      },
    }).concat(autoSaveMiddleware),

  devTools: process.env.NODE_ENV !== 'production',
})

// Типы
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Типизированные хуки для useDispatch и useSelector
export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

// Вспомогательные селекторы
export const selectTodoNodes = (state: RootState) => state.todoNodes
export const selectViewport = (state: RootState) => state.viewport
export const selectCanvasDnd = (state: RootState) => state.canvasDnd
export const selectContextMenu = (state: RootState) => state.contextMenu
export const selectTodoForm = (state: RootState) => state.todoForm

// Утилита для создания селекторов с мемоизацией
export const createSelector = <T, R>(
  selector: (state: RootState) => T,
  transformer: (value: T) => R
) => {
  return (state: RootState) => transformer(selector(state))
}