// src/features/todo-nodes/ui/TodoNode/TodoNode.tsx
import React, { useRef, useEffect } from 'react'
import { Todo } from '@entities/todo//model/types'
import { useCanvasDnd } from '@features/canvas-dnd/lib/useCanvasDnd'
import { useAppDispatch } from '@shared/lib/state'
import { updateTodo } from '../../model/slice'
import styles from './TodoNode.module.css'

interface TodoNodeProps {
  node: Todo
}

export const TodoNode: React.FC<TodoNodeProps> = ({ node }) => {
  const dispatch = useAppDispatch()
  const nodeRef = useRef<HTMLDivElement>(null)
  const { handleDragStart, isDragging, draggedNodeId } = useCanvasDnd()
  

  const getStatusColor = (status: Todo['status']) => {
    switch (status) {
      case 'todo': return '#6b7280'
      case 'in-progress': return '#f59e0b'
      case 'done': return '#10b981'
      case 'blocked': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const getPriorityColor = (priority: Todo['priority']) => {
    switch (priority) {
      case 'low': return '#6b7280'
      case 'medium': return '#f59e0b'
      case 'high': return '#ef4444'
      case 'critical': return '#7c3aed'
      default: return '#6b7280'
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return // Только левая кнопка мыши
    
    e.preventDefault()
    e.stopPropagation()
    
    if (nodeRef.current) {
      const rect = nodeRef.current.getBoundingClientRect()
      handleDragStart(node.id, e, rect)
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation()
    
    if (nodeRef.current) {
      const rect = nodeRef.current.getBoundingClientRect()
      handleDragStart(node.id, e, rect)
    }
  }

  // Обновляем позицию ноды при перемещении
  useEffect(() => {
    if (isDragging && draggedNodeId === node.id) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        dispatch(updateTodo({
          id: node.id,
          position: {
            x: e.clientX - 110, // Половина ширины ноды
            y: e.clientY - 75,  // Половина высоты ноды
          }
        }))
      }

      const handleGlobalTouchMove = (e: TouchEvent) => {
        if (e.touches.length > 0) {
          dispatch(updateTodo({
            id: node.id,
            position: {
              x: e.touches[0].clientX - 110,
              y: e.touches[0].clientY - 75,
            }
          }))
        }
      }

      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('touchmove', handleGlobalTouchMove)

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove)
        document.removeEventListener('touchmove', handleGlobalTouchMove)
      }
    }
  }, [isDragging, draggedNodeId, node.id, dispatch])

  const isBeingDragged = isDragging && draggedNodeId === node.id

  return (
    <div
      ref={nodeRef}
      className={`${styles.node} ${isBeingDragged ? styles.dragging : ''}`}
      style={{
        left: node.position.x,
        top: node.position.y,
        borderColor: getStatusColor(node.status),
        opacity: isBeingDragged ? 0.7 : 1,
        transform: isBeingDragged ? 'scale(1.05)' : 'scale(1)',
        zIndex: isBeingDragged ? 1000 : 1,
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      data-node-id={node.id}
    >
      <div className={styles.header}>
        <h4 className={styles.title}>
          {node.title}
        </h4>
        <span 
          className={styles.status}
          style={{ backgroundColor: getStatusColor(node.status) }}
        >
          {node.status}
        </span>
      </div>
      
      <p className={styles.description}>
        {node.description || 'Нет описания'}
      </p>
      
      <div className={styles.footer}>
        <span 
          className={styles.priority}
          style={{ color: getPriorityColor(node.priority) }}
        >
          {node.priority}
        </span>
        {node.dueDate && (
          <span className={styles.dueDate}>
            {new Date(node.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>
      
      {node.tags.length > 0 && (
        <div className={styles.tags}>
          {node.tags.slice(0, 3).map(tag => (
            <span key={tag} className={styles.tag}>
              {tag}
            </span>
          ))}
        </div>
      )}
      
      {/* Индикатор перемещения */}
      <div className={styles.dragHandle}>
        ⋮⋮
      </div>
    </div>
  )
}