// src/features/selection/lib/useMarqueeSelection.ts
import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@shared/lib/state'
import { startMarquee, updateMarquee, endMarquee } from '../model/slice'
import { RootState } from '@shared/lib/state/store'

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

interface NodeInfo {
  id: string
  type: 'todo' | 'image'
  position: { x: number; y: number }
  size: { width: number; height: number }
}

export const useMarqueeSelection = () => {
  const dispatch = useAppDispatch()
  
  const marquee = useAppSelector((state: RootState) => state.selection?.marquee)

  // Начать выделение
  const handleStartMarquee = useCallback((canvasPoint: { x: number; y: number }) => {
    dispatch(startMarquee(canvasPoint))
  }, [dispatch])

  // Обновить выделение
  const handleUpdateMarquee = useCallback((canvasPoint: { x: number; y: number }) => {
    dispatch(updateMarquee(canvasPoint))
  }, [dispatch])

  // Завершить выделение
  const handleEndMarquee = useCallback(() => {
    dispatch(endMarquee())
  }, [dispatch])

  // Получить прямоугольник выделения в нормализованном виде
  const getMarqueeRect = useCallback((): Rect | null => {
    if (!marquee?.isActive || !marquee.startPoint || !marquee.endPoint) return null
    
    const x = Math.min(marquee.startPoint.x, marquee.endPoint.x)
    const y = Math.min(marquee.startPoint.y, marquee.endPoint.y)
    const width = Math.abs(marquee.endPoint.x - marquee.startPoint.x)
    const height = Math.abs(marquee.endPoint.y - marquee.startPoint.y)
    
    return { x, y, width, height }
  }, [marquee])

  // Проверить, находится ли нода внутри прямоугольника
  const isNodeInRect = useCallback((node: NodeInfo, rect: Rect): boolean => {
    const nodeRight = node.position.x + (node.size?.width || 200)
    const nodeBottom = node.position.y + (node.size?.height || 150)
    const rectRight = rect.x + rect.width
    const rectBottom = rect.y + rect.height
    
    // Проверяем пересечение
    return (
      node.position.x < rectRight &&
      nodeRight > rect.x &&
      node.position.y < rectBottom &&
      nodeBottom > rect.y
    )
  }, [])

  // Найти все ноды внутри прямоугольника
  const getNodesInRect = useCallback((
    todoNodes: NodeInfo[],
    imageNodes: NodeInfo[]
  ): { todoIds: string[]; imageIds: string[] } => {
    const rect = getMarqueeRect()
    if (!rect) return { todoIds: [], imageIds: [] }
    
    const todoIds = todoNodes
      .filter(node => isNodeInRect(node, rect))
      .map(node => node.id)
    
    const imageIds = imageNodes
      .filter(node => isNodeInRect(node, rect))
      .map(node => node.id)
    
    return { todoIds, imageIds }
  }, [getMarqueeRect, isNodeInRect])

  return {
    marquee,
    handleStartMarquee,
    handleUpdateMarquee,
    handleEndMarquee,
    getMarqueeRect,
    getNodesInRect,
    isActive: marquee?.isActive || false,
  }
}