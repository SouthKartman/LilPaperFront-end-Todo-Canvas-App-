// src/features/canvas-dnd/lib/useCanvasDnd.ts

import { useCallback, useRef, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@shared/lib/state'
import { startDrag, updateDrag, endDrag } from '../model/slice'

export const useCanvasDnd = (viewport?: { position: { x: number; y: number }; scale: number }) => {
  const dispatch = useAppDispatch()
  const dragState = useAppSelector((state: any) => state.canvasDnd?.drag)
  const isDraggingRef = useRef(false)
  const startNodePosRef = useRef({ x: 0, y: 0 })
  
  const scaleRef = useRef(viewport?.scale || 1)
  const vpRef = useRef(viewport?.position || { x: 0, y: 0 })

  useEffect(() => {
    scaleRef.current = viewport?.scale || 1
    vpRef.current = viewport?.position || { x: 0, y: 0 }
  }, [viewport?.scale, viewport?.position.x, viewport?.position.y])

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDraggingRef.current) {
        dispatch(endDrag())
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        isDraggingRef.current = false
      }
    }
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [dispatch])

  const handleDragStart = useCallback((
    nodeId: string,
    event: React.MouseEvent | React.TouchEvent,
    nodePosition: { x: number; y: number }
  ) => {
    if (isDraggingRef.current) return
    
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY

    startNodePosRef.current = { x: nodePosition.x, y: nodePosition.y }
    isDraggingRef.current = true

    dispatch(startDrag({
      nodeId,
      startX: clientX,
      startY: clientY,
      offsetX: 0,
      offsetY: 0,
    }))

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      const moveX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
      const moveY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY
      
      // Дельта в экранных пикселях
      const deltaX = moveX - clientX
      const deltaY = moveY - clientY
      
      // Переводим в canvas-координаты и прибавляем к начальной позиции
      const newX = startNodePosRef.current.x + deltaX / scaleRef.current
      const newY = startNodePosRef.current.y + deltaY / scaleRef.current
      
      dispatch(updateDrag({ x: newX, y: newY }))
    }

    const cleanup = () => {
      dispatch(endDrag())
      isDraggingRef.current = false
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', cleanup)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'grabbing'
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', cleanup)
  }, [dispatch])

  return {
    dragState,
    handleDragStart,
    isDragging: dragState?.isDragging || false,
    draggedNodeId: dragState?.draggedNodeId ?? null,
    dragPosition: dragState?.currentPosition || { x: 0, y: 0 },
  }
}