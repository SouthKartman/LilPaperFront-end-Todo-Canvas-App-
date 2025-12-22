// src/features/canvas-dnd/model/types.ts
export interface DragState {
  isDragging: boolean
  draggedNodeId: string | null
  startPosition: { x: number; y: number }
  currentPosition: { x: number; y: number }
  offset: { x: number; y: number }
}

export interface DropZone {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export interface CanvasDndState {
  drag: DragState
  dropZones: DropZone[]
}