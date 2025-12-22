// src/widgets/canvas-workspace/ui/CanvasWorkspace.tsx
import React, { useEffect } from 'react'
import { useTodoNodes } from '@features/todo-nodes/lib/useTodoNode'
import { TodoNode } from '@features/todo-nodes/ui/TodoNode/TodoNode'
import { useCanvasDnd } from '@features/canvas-dnd/lib/useCanvasDnd'
import styles from './CanvasWorkspace.module.css'

export const CanvasWorkspace: React.FC = () => {
  const { nodes } = useTodoNodes()
  const { dragState, isDragging } = useCanvasDnd()

  // Блокируем скролл страницы при перетаскивании
  useEffect(() => {
    if (isDragging) {
      document.body.style.overflow = 'hidden'
      document.body.style.userSelect = 'none'
    } else {
      document.body.style.overflow = ''
      document.body.style.userSelect = ''
    }

    return () => {
      document.body.style.overflow = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging])

  return (
    <div className={styles.workspace}>
      <div className={styles.canvas}>
        <div className={styles.grid} />
        
        {/* Отображаем все ноды */}
        {nodes.map((node: any) => (
          <TodoNode key={node.id} node={node} />
        ))}

        {/* Индикатор перетаскивания */}
        {isDragging && dragState?.draggedNodeId && (
          <div
            className={styles.dragPreview}
            style={{
              left: dragState.currentPosition.x - dragState.offset.x,
              top: dragState.currentPosition.y - dragState.offset.y,
            }}
          >
            Перемещение...
          </div>
        )}
      </div>
    </div>
  )
}