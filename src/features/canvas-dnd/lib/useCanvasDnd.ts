import { useCallback, useSyncExternalStore } from 'react'
import { useAppDispatch, useAppSelector } from '@shared/lib/state'
import { startDrag } from '../model/slice'
import {
  setDragSession,
  getDragSession,
  subscribeDragSession,
} from './dragSession'

// Оптимизация рендера: компоненты-ноды подписаны ТОЛЬКО на булевый флаг
// «перетаскивается ли именно эта нода» (через useSyncExternalStore с примитивом).
// Координаты курсора в React-стейт больше не попадают — движение ноды выполняет
// drag-контроллер напрямую через DOM transform. На каждый mousemove ни один
// компонент не перерисовывается.
export const useIsNodeBeingDragged = (nodeId: string): boolean =>
  useSyncExternalStore(
    subscribeDragSession,
    () => getDragSession()?.nodeId === nodeId,
    () => false
  )

export const useCanvasDnd = () => {
  const dispatch = useAppDispatch()
  // Только isDragging/draggedNodeId — без currentPosition (он больше не течёт в стор)
  const isDragging = useAppSelector((state: any) => state.canvasDnd?.drag?.isDragging ?? false)
  const draggedNodeId = useAppSelector((state: any) => state.canvasDnd?.drag?.draggedNodeId ?? null)

  const handleDragStart = useCallback(
    (
      nodeId: string,
      event: React.MouseEvent | React.TouchEvent,
      elementRect: DOMRect
    ) => {
      let clientX: number, clientY: number

      if ('touches' in event) {
        clientX = event.touches[0].clientX
        clientY = event.touches[0].clientY
      } else {
        clientX = event.clientX
        clientY = event.clientY
      }

      const offsetX = clientX - elementRect.left
      const offsetY = clientY - elementRect.top

      dispatch(
        startDrag({
          nodeId,
          startX: clientX,
          startY: clientY,
          offsetX,
          offsetY,
        })
      )

      // Сигнал для drag-контроллера CanvasWorkspace: началась живая сессия.
      // Дальше всё делает контроллер (rAF + DOM transform), этот хук — только инициатор.
      setDragSession({
        nodeId,
        nodeType: 'todo', // тип уточнит контроллер по стору изображений
        offsetX,
        offsetY,
      })
    },
    [dispatch]
  )

  return {
    handleDragStart,
    isDragging,
    draggedNodeId,
  }
}
