// src/features/canvas-dnd/lib/dragSession.ts
// Модуль «живой» drag-сессии. Координаты курсора обновляются через нативный
// mousemove (минуя React render), а перемещение ноды выполняется напрямую через
// DOM transform + requestAnimationFrame. В Redux диспатчатся только startDrag и
// endDrag; финальная позиция пишется в стор один раз при отпускании.

export interface DragSession {
  nodeId: string
  nodeType: 'todo' | 'image'
  offsetX: number
  offsetY: number
}

type Listener = () => void

let session: DragSession | null = null
const listeners = new Set<Listener>()

export const setDragSession = (next: DragSession | null): void => {
  session = next
  listeners.forEach((l) => l())
}

export const getDragSession = (): DragSession | null => session

export const subscribeDragSession = (listener: Listener): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Переводит экранные координаты в координаты холста (пространство до transform
 * контейнера контента). Инвариант: canvasPos = (screen - rectOrigin - pan) / scale.
 */
export const convertScreenToCanvas = (
  screenX: number,
  screenY: number,
  containerRect: DOMRect,
  viewport: { position: { x: number; y: number }; scale: number }
): { x: number; y: number } => ({
  x: (screenX - containerRect.left - viewport.position.x) / viewport.scale,
  y: (screenY - containerRect.top - viewport.position.y) / viewport.scale,
})
