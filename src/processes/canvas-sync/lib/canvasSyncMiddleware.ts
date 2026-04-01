import { Middleware } from '@reduxjs/toolkit'
import { RootState } from '@shared/lib/state/store'
import { addNodeToCanvas, removeNodeFromCanvas } from '@features/project-management/model/slice'

export const canvasSyncMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action)
  const state = store.getState() as RootState

  // Автоматически добавляем созданную ноду задачи на текущее полотно
  if (action.type === 'todoNodes/createTodoAtPosition' || action.type === 'todoNodes/createTodo') {
    const currentProject = state.project.currentProjectId 
      ? state.project.projects[state.project.currentProjectId] 
      : null
    
    if (currentProject?.currentPageId) {
      const page = state.project.pages[currentProject.currentPageId]
      if (page?.canvasId) {
        setTimeout(() => {
          const nodeIds = Object.keys(state.todoNodes.nodes)
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

  // Добавляем изображение на холст при создании
  if (action.type === 'imageNodes/addImageNode' && action.payload) {
    const currentProject = state.project.currentProjectId 
      ? state.project.projects[state.project.currentProjectId] 
      : null
    
    if (currentProject?.currentPageId) {
      const page = state.project.pages[currentProject.currentPageId]
      if (page?.canvasId) {
        const imageId = action.payload.id
        store.dispatch(addNodeToCanvas({
          canvasId: page.canvasId,
          nodeId: imageId,
        }))
      }
    }
  }

  // Добавляем несколько изображений на холст
  if (action.type === 'imageNodes/addImageNodes' && action.payload) {
    const currentProject = state.project.currentProjectId 
      ? state.project.projects[state.project.currentProjectId] 
      : null
    
    if (currentProject?.currentPageId) {
      const page = state.project.pages[currentProject.currentPageId]
      if (page?.canvasId) {
        action.payload.forEach((image: any) => {
          store.dispatch(addNodeToCanvas({
            canvasId: page.canvasId,
            nodeId: image.id,
          }))
        })
      }
    }
  }

  // Удаляем ноду задачи с полотна (при удалении из БД)
  if (action.type === 'todoNodes/deleteFromDB/fulfilled' && action.payload) {
    const nodeId = action.payload
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

  // Массовое удаление нод с полотна
  if (action.type === 'todoNodes/deleteMultipleFromDB/fulfilled' && action.payload) {
    const nodeIds = action.payload
    const currentProject = state.project.currentProjectId 
      ? state.project.projects[state.project.currentProjectId] 
      : null
    
    if (currentProject?.currentPageId) {
      const page = state.project.pages[currentProject.currentPageId]
      if (page?.canvasId) {
        nodeIds.forEach((nodeId: string) => {
          store.dispatch(removeNodeFromCanvas({
            canvasId: page.canvasId,
            nodeId,
          }))
        })
      }
    }
  }

  // Удаляем ноду задачи с полотна (старый способ - для совместимости)
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

  // Удаляем изображение с полотна
  if (action.type === 'imageNodes/deleteImageNode' && action.payload) {
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

  // Удаляем несколько изображений
  if (action.type === 'imageNodes/deleteImageNodes' && action.payload) {
    const nodeIds = action.payload as string[]
    const currentProject = state.project.currentProjectId 
      ? state.project.projects[state.project.currentProjectId] 
      : null
    
    if (currentProject?.currentPageId) {
      const page = state.project.pages[currentProject.currentPageId]
      if (page?.canvasId) {
        nodeIds.forEach(nodeId => {
          store.dispatch(removeNodeFromCanvas({
            canvasId: page.canvasId,
            nodeId,
          }))
        })
      }
    }
  }

  // Массовое удаление выделенных задач
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

  return result
}