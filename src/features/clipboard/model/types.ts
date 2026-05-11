// src/features/clipboard/model/types.ts

export interface ClipboardTodoData {
  type: 'todo'
  title: string
  description: string
  status: string
  priority: string
  tags: string[]
  dueDate?: string
  size: { width: number; height: number }
}

export interface ClipboardImageData {
  type: 'image'
  filePath: string
  originalName: string
  fileSize: number
  mimeType: string
  size: { width: number; height: number }
}

export interface ClipboardNode {
  type: 'todo' | 'image'
  data: ClipboardTodoData | ClipboardImageData
  position: { x: number; y: number }
}

export interface ClipboardData {
  version: '1.0'
  nodes: ClipboardNode[]
}