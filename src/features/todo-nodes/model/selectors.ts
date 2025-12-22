// src/features/todo-nodes/model/selectors.ts
import { RootState } from '@shared/lib/state/store'

export const selectAllTodoNodes = (state: RootState) => {
  return Object.values(state.todoNodes.nodes)
}

export const selectTodoNodeById = (state: RootState, nodeId: string) => {
  return state.todoNodes.nodes[nodeId]
}

export const selectSelectedTodoNodes = (state: RootState) => {
  return state.todoNodes.selectedNodeIds
    .map(id => state.todoNodes.nodes[id])
    .filter(Boolean)
}

export const selectEditingTodoNode = (state: RootState) => {
  if (state.todoNodes.editingNodeId) {
    return state.todoNodes.nodes[state.todoNodes.editingNodeId]
  }
  return null
}

export const selectTodoNodesByStatus = (state: RootState, status: string) => {
  return Object.values(state.todoNodes.nodes).filter(node => node.status === status)
}

export const selectTodoNodesByPriority = (state: RootState, priority: string) => {
  return Object.values(state.todoNodes.nodes).filter(node => node.priority === priority)
}