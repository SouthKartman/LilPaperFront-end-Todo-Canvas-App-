// src/features/selection/model/types.ts
export interface SelectionState {
  selectedTodoIds: string[]
  selectedImageIds: string[]
  marquee: {
    isActive: boolean
    startPoint: { x: number; y: number } | null  // canvas координаты
    endPoint: { x: number; y: number } | null    // canvas координаты
  }
}