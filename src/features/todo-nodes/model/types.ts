// src/features/todo-nodes/model/types.ts
import { Todo } from '@entities/todo/model/types'

export type TodoNode = Todo

export interface TodoNodesState {
  nodes: Record<string, TodoNode>
  selectedNodeIds: string[]
}

