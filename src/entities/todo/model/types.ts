// src/entities/todo/model/types.ts
export type TodoStatus = 'todo' | 'in-progress' | 'done' | 'blocked'
export type TodoPriority = 'low' | 'medium' | 'high' | 'critical'

export interface Todo {
  id: string
  title: string
  description: string
  status: TodoStatus
  priority: TodoPriority
  createdAt: string;  // Изменено: Date → string (ISO format)
  updatedAt: string;  // Изменено: Date → string (ISO format)
  dueDate?: string;   // Изменено: Date → string (ISO format)
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

export interface TodoNodesState {
  nodes: Record<string, Todo>;
  selectedNodeIds: string[];
  editingNodeId: string | null;
}

export interface TodoNodesState {
  nodes: Record<string, Todo>; // { [id]: TodoNode }
  selectedNodeIds: string[];
  editingNodeId: string | null;
}

// Хелпер для создания ISO даты
export const createISODate = (date?: Date): string => {
  return (date || new Date()).toISOString();
};
// Реэкспорт
export * from './types'