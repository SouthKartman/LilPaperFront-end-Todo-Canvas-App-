// src/shared/lib/state/store.ts
import { configureStore } from '@reduxjs/toolkit'
import todoNodesReducer from '@features/todo-nodes/model/slice'
import canvasDndReducer from '@features/canvas-dnd/model/slice'

// Создаем начальные ноды
const initialNodes = {
  'node-1': {
    id: 'node-1',
    title: 'Разработать архитектуру',
    description: 'Создать модульную архитектуру приложения',
    status: 'in-progress',
    priority: 'high',
    createdAt: new Date(),
    updatedAt: new Date(),
    dueDate: new Date('2024-12-25'),
    tags: ['архитектура', 'планирование'],
    position: { x: 100, y: 100 },
    size: { width: 220, height: 150 },
  },
  'node-2': {
    id: 'node-2',
    title: 'Настроить Canvas',
    description: 'Интеграция Konva.js с React и DnD',
    status: 'todo',
    priority: 'medium',
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: ['canvas', 'ui'],
    position: { x: 400, y: 150 },
    size: { width: 220, height: 150 },
  },
  'node-3': {
    id: 'node-3',
    title: 'Реализовать DnD',
    description: 'Drag & Drop для перемещения нод',
    status: 'todo',
    priority: 'high',
    createdAt: new Date(),
    updatedAt: new Date(),
    dueDate: new Date('2024-12-20'),
    tags: ['dnd', 'интерактивность'],
    position: { x: 200, y: 300 },
    size: { width: 220, height: 150 },
  },
  'node-4': {
    id: 'node-4',
    title: 'Добавить панель свойств',
    description: 'Редактирование свойств выбранной ноды',
    status: 'done',
    priority: 'low',
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: ['ui', 'формы'],
    position: { x: 500, y: 350 },
    size: { width: 220, height: 150 },
  },
}

const preloadedState = {
  todoNodes: {
    nodes: initialNodes,
    selectedNodeIds: [],
  },
  canvasDnd: {
    drag: {
      isDragging: false,
      draggedNodeId: null,
      startPosition: { x: 0, y: 0 },
      currentPosition: { x: 0, y: 0 },
      offset: { x: 0, y: 0 },
    },
    dropZones: [],
  },
}

export const store = configureStore({
  reducer: {
    todoNodes: todoNodesReducer,
    canvasDnd: canvasDndReducer,
  },
  preloadedState,
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch