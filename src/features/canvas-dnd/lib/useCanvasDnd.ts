// src/features/canvas-dnd/lib/useCanvasDnd.ts
import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@shared/lib/state'
import { startDrag, updateDrag, endDrag } from '../model/slice'

export const useCanvasDnd = () => {
  const dispatch = useAppDispatch()
  const dragState = useAppSelector((state: any) => state.canvasDnd?.drag)
  const dropZones = useAppSelector((state: any) => state.canvasDnd?.dropZones || [])

  const handleDragStart = useCallback((
    nodeId: string,
    event: React.MouseEvent | React.TouchEvent,
    elementRect: DOMRect
  ) => {
    let clientX, clientY
    
    if ('touches' in event) {
      clientX = event.touches[0].clientX
      clientY = event.touches[0].clientY
    } else {
      clientX = event.clientX
      clientY = event.clientY
    }

    const offsetX = clientX - elementRect.left
    const offsetY = clientY - elementRect.top

    dispatch(startDrag({
      nodeId,
      startX: clientX,
      startY: clientY,
      offsetX,
      offsetY,
    }))

    // Добавляем обработчики для документа
    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      let moveX, moveY
      
      if ('touches' in e) {
        moveX = e.touches[0].clientX
        moveY = e.touches[0].clientY
      } else {
        moveX = (e as MouseEvent).clientX
        moveY = (e as MouseEvent).clientY
      }

      dispatch(updateDrag({ x: moveX, y: moveY }))
    }

    const handleMouseUp = () => {
      dispatch(endDrag())
      document.removeEventListener('mousemove', handleMouseMove as EventListener)
      document.removeEventListener('touchmove', handleMouseMove as EventListener)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchend', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove as EventListener)
    document.addEventListener('touchmove', handleMouseMove as EventListener)
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('touchend', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove as EventListener)
      document.removeEventListener('touchmove', handleMouseMove as EventListener)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchend', handleMouseUp)
    }
  }, [dispatch])

  const getDropZoneAtPoint = useCallback((x: number, y: number) => {
    return dropZones.find(zone => {
      return x >= zone.x && 
             x <= zone.x + zone.width && 
             y >= zone.y && 
             y <= zone.y + zone.height
    })
  }, [dropZones])

  return {
    dragState,
    dropZones,
    handleDragStart,
    getDropZoneAtPoint,
    isDragging: dragState?.isDragging || false,
    draggedNodeId: dragState?.draggedNodeId,
    dragPosition: dragState?.currentPosition || { x: 0, y: 0 },
  }
}