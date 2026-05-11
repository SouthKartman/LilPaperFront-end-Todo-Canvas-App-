import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@shared/lib/state'
import { startDrag, updateDrag, endDrag } from '../model/slice'

export const useCanvasDnd = () => {
  const dispatch = useAppDispatch()
  const dragState = useAppSelector((state: any) => state.canvasDnd?.drag)

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

    console.log('🎯 Drag start:', { nodeId, clientX, clientY, offsetX, offsetY })

    dispatch(startDrag({
      nodeId,
      startX: clientX,
      startY: clientY,
      offsetX,
      offsetY,
    }))

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      
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
      console.log('🎯 Drag end')
      dispatch(endDrag())
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('touchmove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchend', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'grabbing'
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('touchmove', handleMouseMove, { passive: false })
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('touchend', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('touchmove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchend', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
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