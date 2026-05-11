import { TodoNode, TodoNodeType } from '../model/types'

export const createTodoNode = (options: {
  position: { x: number; y: number };
  type?: TodoNodeType;
  title?: string;
  description?: string;
}): TodoNode => {
  const { position, type = 'default', title = 'Новая задача', description = '' } = options;
  
  return {
    id: `todo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    position,
    size: { width: 280, height: 180 },
    zIndex: 1,
    title,
    description,
    priority: 'medium',
    status: 'todo',
    tags: [],
    dueDate: null,
    isSelected: false,
    isEditing: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export const createTodoNodeAtPosition = (
  canvasPosition: { x: number; y: number },
  viewportTransform: { x: number; y: number; zoom: number }
): TodoNode => {
  // Конвертируем координаты экрана в координаты канваса
  const canvasX = (canvasPosition.x - viewportTransform.x) / viewportTransform.zoom
  const canvasY = (canvasPosition.y - viewportTransform.y) / viewportTransform.zoom
  
  return createTodoNode({
    position: { x: canvasX, y: canvasY },
  })
}