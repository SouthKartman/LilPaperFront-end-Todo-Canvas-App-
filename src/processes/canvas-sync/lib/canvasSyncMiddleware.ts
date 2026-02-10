// processes/canvas-sync/lib/canvasSyncMiddleware.ts
import { Middleware } from '@reduxjs/toolkit'
import { RootState } from '@shared/lib/state/store'
import { addNodeToCanvas, removeNodeFromCanvas } from '@features/project-management/model/slice'

export const canvasSyncMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action)
  const state = store.getState() as RootState

  // 🆕 Автоматически добавляем созданную ноду на текущее полотно
  if (action.type === 'todoNodes/createTodoAtPosition' && action.payload) {
    const currentProject = state.project.currentProjectId 
      ? state.project.projects[state.project.currentProjectId] 
      : null
    
    if (currentProject?.currentPageId) {
      const page = state.project.pages[currentProject.currentPageId]
      if (page?.canvasId) {
        // Находим последнюю созданную ноду
        setTimeout(() => {
          const todoNodes = state.todoNodes.nodes
          const nodeIds = Object.keys(todoNodes)
          const lastNodeId = nodeIds[nodeIds.length - 1]
          
          if (lastNodeId) {
            store.dispatch(addNodeToCanvas({
              canvasId: page.canvasId,
              nodeId: lastNodeId,
            }))
          }
        }, 50)
      }
    }
  }

  // 🆕 Автоматически добавляем ноду при создании через createTodo
  if (action.type === 'todoNodes/createTodo' && action.payload) {
    const currentProject = state.project.currentProjectId 
      ? state.project.projects[state.project.currentProjectId] 
      : null
    
    if (currentProject?.currentPageId) {
      const page = state.project.pages[currentProject.currentPageId]
      if (page?.canvasId) {
        setTimeout(() => {
          const todoNodes = state.todoNodes.nodes
          const nodeIds = Object.keys(todoNodes)
          const lastNodeId = nodeIds[nodeIds.length - 1]
          
          if (lastNodeId) {
            store.dispatch(addNodeToCanvas({
              canvasId: page.canvasId,
              nodeId: lastNodeId,
            }))
          }
        }, 50)
      }
    }
  }

  // 🆕 Удаляем ноду с полотна при удалении
  if (action.type === 'todoNodes/deleteTodo' && action.payload) {
    const nodeId = action.payload as string
    const currentProject = state.project.currentProjectId 
      ? state.project.projects[state.project.currentProjectId] 
      : null
    
    if (currentProject?.currentPageId) {
      const page = state.project.pages[currentProject.currentPageId]
      if (page?.canvasId) {
        store.dispatch(removeNodeFromCanvas({
          canvasId: page.canvasId,
          nodeId,
        }))
      }
    }
  }

  // 🆕 Удаляем ноды с полотна при массовом удалении
  if (action.type === 'todoNodes/deleteSelectedTodos') {
    const selectedNodeIds = state.todoNodes.selectedNodeIds
    const currentProject = state.project.currentProjectId 
      ? state.project.projects[state.project.currentProjectId] 
      : null
    
    if (currentProject?.currentPageId) {
      const page = state.project.pages[currentProject.currentPageId]
      if (page?.canvasId) {
        selectedNodeIds.forEach(nodeId => {
          store.dispatch(removeNodeFromCanvas({
            canvasId: page.canvasId,
            nodeId,
          }))
        })
      }
    }
  }

  // 🆕 При переключении страницы обновляем видимые ноды
  if (action.type === 'project/switchPage') {
    console.log('🔄 Переключение страницы, загружаем новое полотно')
  }

  // 🆕 При удалении страницы удаляем все ее ноды
  if (action.type === 'project/removePage' && action.payload) {
    const { pageId } = action.payload
    const page = state.project.pages[pageId]
    
    if (page?.canvasId) {
      const canvas = state.project.canvases[page.canvasId]
      if (canvas) {
        // Удаляем все ноды этой страницы из общего хранилища
        canvas.nodes.forEach(nodeId => {
          store.dispatch(require('@features/todo-nodes/model/slice').deleteTodo(nodeId))
        })
      }
    }
  }

  return result
}