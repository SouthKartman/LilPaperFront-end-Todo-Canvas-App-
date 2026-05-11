import { nanoid } from 'nanoid'
import { Todo } from '@entities/todo/model/types'
import { ImageNode } from '@entities/image/model/types'
import { ClipboardData, ClipboardNode } from '../model/types'

export const serializeToClipboard = (
  selectedTodos: Todo[],
  selectedImages: ImageNode[]
): ClipboardData => {
  const nodes: ClipboardNode[] = []

  selectedTodos.forEach(todo => {
    nodes.push({
      type: 'todo',
      data: {
        type: 'todo',
        title: todo.title,
        description: todo.description,
        status: todo.status,
        priority: todo.priority,
        tags: [...todo.tags],
        dueDate: todo.dueDate,
        size: { ...todo.size, height: todo.size?.height || 150 },
      },
      position: { ...todo.position },
    })
  })

  selectedImages.forEach(image => {
    nodes.push({
      type: 'image',
      data: {
        type: 'image',
        filePath: image.filePath,
        originalName: image.originalName,
        fileSize: image.fileSize,
        mimeType: image.mimeType,
        size: { ...image.size },
      },
      position: { ...image.position },
    })
  })

  return { version: '1.0', nodes }
}

export const deserializeFromClipboard = (
  clipboardData: ClipboardData,
  targetPageId: string,
  basePosition: { x: number; y: number }
): { todos: Todo[]; images: ImageNode[] } => {
  const todos: Todo[] = []
  const images: ImageNode[] = []
  const now = new Date().toISOString()

  let minX = Infinity, minY = Infinity
  clipboardData.nodes.forEach(node => {
    minX = Math.min(minX, node.position.x)
    minY = Math.min(minY, node.position.y)
  })

  clipboardData.nodes.forEach((node) => {
    const offsetX = node.position.x - minX
    const offsetY = node.position.y - minY

    if (node.type === 'todo') {
      const data = node.data as any
      const newTodo: Todo = {
        id: nanoid(),
        type: 'todo',
        pageId: targetPageId,
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        createdAt: now,
        updatedAt: now,
        dueDate: data.dueDate,
        tags: [...(data.tags || [])],
        position: {
          x: basePosition.x + offsetX + 30,
          y: basePosition.y + offsetY + 30,
        },
        size: { width: data.size?.width || 280, height: data.size?.height || 150 },
      }
      todos.push(newTodo)
    } else {
      const data = node.data as any
      const newImage: ImageNode = {
        id: nanoid(),
        type: 'image',
        position: {
          x: basePosition.x + offsetX + 30,
          y: basePosition.y + offsetY + 30,
        },
        size: { ...data.size },
        zIndex: 0,
        filePath: data.filePath,
        originalName: data.originalName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        createdAt: now,
        updatedAt: now,
        pageId: targetPageId,
      }
      images.push(newImage)
    }
  })

  return { todos, images }
}

export const copyToSystemClipboard = async (data: ClipboardData): Promise<boolean> => {
  try {
    const jsonStr = JSON.stringify(data)
    await navigator.clipboard.writeText(jsonStr)
    console.log('✅ Скопировано в буфер обмена:', data.nodes.length, 'элементов')
    return true
  } catch (error) {
    console.error('❌ Ошибка копирования:', error)
    return false
  }
}

export const readFromSystemClipboard = async (): Promise<ClipboardData | null> => {
  try {
    const text = await navigator.clipboard.readText()
    console.log('📋 Прочитано из буфера:', text.substring(0, 100))
    const data = JSON.parse(text)
    
    if (data.version === '1.0' && Array.isArray(data.nodes)) {
      return data
    }
    console.warn('⚠️ Неверный формат данных в буфере')
    return null
  } catch (error) {
    console.error('❌ Ошибка чтения из буфера:', error)
    return null
  }
}