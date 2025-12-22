// src/features/canvas-viewport/lib/useCanvasViewport.ts
import { useState, useCallback } from 'react'
import { StageConfig } from 'konva/lib/Stage'

interface ViewportState {
  x: number
  y: number
  scale: number
}

export const useCanvasViewport = () => {
  const [viewport, setViewport] = useState<ViewportState>({
    x: 0,
    y: 0,
    scale: 1,
  })

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    
    const scaleBy = 1.1
    const stage = e.currentTarget as HTMLElement
    const oldScale = viewport.scale
    const pointer = {
      x: stage.getBoundingClientRect().x,
      y: stage.getBoundingClientRect().y,
    }

    const mousePointTo = {
      x: (pointer.x - viewport.x) / oldScale,
      y: (pointer.y - viewport.y) / oldScale,
    }

    const newScale = e.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy

    setViewport({
      scale: newScale,
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    })
  }, [viewport])

  const handleDrag = useCallback((e: any) => {
    const stage = e.target.getStage()
    if (stage) {
      setViewport({
        ...viewport,
        x: stage.x(),
        y: stage.y(),
      })
    }
  }, [viewport])

  return {
    viewport,
    handleWheel,
    handleDrag,
    setViewport,
  }
}