// src/features/canvas-dnd/lib/useCanvasDnd.ts

import { useCallback, useRef, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@shared/lib/state'
import { startDrag, updateDrag, endDrag } from '../model/slice'

export const useCanvasDnd = () => {
  const dispatch = useAppDispatch()
  const dragState = useAppSelector((state: any) => state.canvasDnd?.drag)
  const rafIdRef = useRef<number | null>(null)
  const lastMoveTimeRef = useRef<number>(0)
  const lastPositionRef = useRef({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)

  // Принудительное завершение drag
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDraggingRef.current) {
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current)
          rafIdRef.current = null
        }
        dispatch(endDrag())
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        isDraggingRef.current = false
      }
    }
    
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp)
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [dispatch])

  const handleDragStart = useCallback((
    nodeId: string,
    event: React.MouseEvent | React.TouchEvent,
    elementRect: DOMRect
  ) => {
    // Предотвращаем двойной старт
    if (isDraggingRef.current) return
    
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
    
    isDraggingRef.current = true
    lastPositionRef.current = { x: clientX, y: clientY }

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      
      const now = performance.now()
      // Throttle 16ms для 60fps
      if (now - lastMoveTimeRef.current < 16) return
      lastMoveTimeRef.current = now
      
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
      }
      
      rafIdRef.current = requestAnimationFrame(() => {
        let moveX, moveY
        
        if ('touches' in e) {
          moveX = e.touches[0].clientX
          moveY = e.touches[0].clientY
        } else {
          moveX = (e as MouseEvent).clientX
          moveY = (e as MouseEvent).clientY
        }
        
        // Пропускаем если позиция не изменилась
        if (moveX === lastPositionRef.current.x && moveY === lastPositionRef.current.y) {
          rafIdRef.current = null
          return
        }
        
        lastPositionRef.current = { x: moveX, y: moveY }
        dispatch(updateDrag({ x: moveX, y: moveY }))
        rafIdRef.current = null
      })
    }

    const handleMouseUp = () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      
      dispatch(endDrag())
      isDraggingRef.current = false
      
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('touchmove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchend', handleMouseUp)
      
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      
      lastMoveTimeRef.current = 0
      lastPositionRef.current = { x: 0, y: 0 }
    }

    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'grabbing'
    
    document.addEventListener('mousemove', handleMouseMove, { passive: false })
    document.addEventListener('touchmove', handleMouseMove, { passive: false })
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('touchend', handleMouseUp)

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
      }
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('touchmove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchend', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      isDraggingRef.current = false
    }
  }, [dispatch])

  return {
    dragState,
    handleDragStart,
    isDragging: dragState?.isDragging || false,
    draggedNodeId: dragState?.draggedNodeId,
    dragPosition: dragState?.currentPosition || { x: 0, y: 0 },
  }
}