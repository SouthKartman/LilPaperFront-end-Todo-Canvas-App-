// src/entities/todo/model/types.ts
export type TodoStatus = 'todo' | 'in-progress' | 'done' | 'blocked'
export type TodoPriority = 'low' | 'medium' | 'high' | 'critical'

export interface Todo {
  id: string
  title: string
  description: string
  status: TodoStatus
  priority: TodoPriority
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

export interface CreateTodoDto {
  title: string
  description?: string
  status?: TodoStatus
  priority?: TodoPriority
  dueDate?: Date
  tags?: string[]
  parentId?: string
  position?: {
    x: number
    y: number
  }
}

export interface UpdateTodoDto extends Partial<CreateTodoDto> {
  id: string
}

// Реэкспорт
export * from './types'