// src/features/todo-nodes/ui/TodoNode/TodoNode.tsx
import React, { useRef, useEffect, useState } from 'react'
import { createISODate, Todo } from '@entities/todo/model/types'
import { useCanvasDnd } from '@features/canvas-dnd/lib/useCanvasDnd'
import { useAppDispatch } from '@shared/lib/state'
import { 
  updateTodo, 
  setTodoPriority,
  setTodoStatus,
  duplicateTodo,
  moveTodo,
  removeTodoTag
} from '../../model/slice'
import styles from './TodoNode.module.css'

interface TodoNodeProps {
  node: Todo & {
    zIndex?: number
    isEditing?: boolean
    type?: 'default' | 'checklist' | 'note' | 'urgent'
  }
  onContextMenu?: (e: React.MouseEvent) => void
  onClick?: (e: React.MouseEvent, nodeId: string) => void
  onDoubleClick?: (e: React.MouseEvent, nodeId: string) => void
  isSelected?: boolean
}

export const TodoNode: React.FC<TodoNodeProps> = ({ 
  node,
  onContextMenu,
  onClick,
  onDoubleClick,
  isSelected = false
}) => {
  const dispatch = useAppDispatch()
  const nodeRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState(node.title)
  const [isEditingDesc, setIsEditingDesc] = useState(false)
  const [editedDescription, setEditedDescription] = useState(node.description || '')
  
  const { handleDragStart, isDragging, draggedNodeId } = useCanvasDnd()

  // Активируем редактирование при изменении isEditing
  useEffect(() => {
    if (node.isEditing && !isEditingTitle) {
      setIsEditingTitle(true)
      setTimeout(() => {
        titleRef.current?.focus()
      }, 10)
    }
  }, [node.isEditing, isEditingTitle])

  // Сохраняем изменения при потере фокуса
  const handleTitleBlur = () => {
    if (editedTitle !== node.title && editedTitle.trim()) {
      dispatch(updateTodo({
        id: node.id,
        title: editedTitle,
        updatedAt: createISODate()
      }))
    }
    setIsEditingTitle(false)
  }

  const handleDescriptionBlur = () => {
    if (editedDescription !== node.description) {
      dispatch(updateTodo({
        id: node.id,
        description: editedDescription,
        updatedAt: createISODate()
      }))
    }
    setIsEditingDesc(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent, type: 'title' | 'desc') => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (type === 'title') {
        handleTitleBlur()
      } else {
        handleDescriptionBlur()
      }
    } else if (e.key === 'Escape') {
      if (type === 'title') {
        setEditedTitle(node.title)
        setIsEditingTitle(false)
      } else {
        setEditedDescription(node.description || '')
        setIsEditingDesc(false)
      }
    }
  }

  const getStatusColor = (status: Todo['status']) => {
    switch (status) {
      case 'todo': return '#6b7280'
      case 'in-progress': return '#f59e0b'
      case 'done': return '#10b981'
      case 'blocked': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const getStatusText = (status: Todo['status']) => {
    switch (status) {
      case 'todo': return 'К выполнению'
      case 'in-progress': return 'В процессе'
      case 'done': return 'Выполнено'
      case 'blocked': return 'Заблокировано'
      default: return status
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

  const getTypeIcon = () => {
    switch (node.type) {
      case 'checklist': return '✅'
      case 'urgent': return '🚨'
      case 'note': return '📝'
      default: return '📋'
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    
    if ((e.target as HTMLElement).closest('.editable') || 
        (e.target as HTMLElement).closest('input') ||
        (e.target as HTMLElement).closest('textarea')) {
      return
    }
    
    e.preventDefault()
    e.stopPropagation()
    
    if (onClick) {
      onClick(e, node.id)
    }
    
    if (!isEditingTitle && !isEditingDesc && nodeRef.current) {
      const rect = nodeRef.current.getBoundingClientRect()
      handleDragStart(node.id, e, rect)
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation()
    
    if (onClick) {
      onClick(e as any, node.id)
    }
    
    if (nodeRef.current && !isEditingTitle && !isEditingDesc) {
      const rect = nodeRef.current.getBoundingClientRect()
      handleDragStart(node.id, e, rect)
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onContextMenu) {
      onContextMenu(e)
    }
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDoubleClick) {
      onDoubleClick(e, node.id)
    } else {
      setIsEditingTitle(true)
      setTimeout(() => {
        titleRef.current?.focus()
      }, 10)
    }
  }

  const handleDescriptionClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isEditingDesc) {
      setIsEditingDesc(true)
    }
  }

  // Обновляем позицию ноды при перемещении
  useEffect(() => {
    if (isDragging && draggedNodeId === node.id) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        dispatch(moveTodo({
          id: node.id,
          position: {
            x: e.clientX - (node.size?.width || 200) / 2,
            y: e.clientY - (node.size?.height || 150) / 2,
          }
        }))
      }

      const handleGlobalTouchMove = (e: TouchEvent) => {
        if (e.touches.length > 0) {
          dispatch(moveTodo({
            id: node.id,
            position: {
              x: e.touches[0].clientX - (node.size?.width || 200) / 2,
              y: e.touches[0].clientY - (node.size?.height || 150) / 2,
            }
          }))
        }
      }

      const handleDragEnd = () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove)
        document.removeEventListener('touchmove', handleGlobalTouchMove)
        document.removeEventListener('mouseup', handleDragEnd)
        document.removeEventListener('touchend', handleDragEnd)
      }

      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('touchmove', handleGlobalTouchMove)
      document.addEventListener('mouseup', handleDragEnd, { once: true })
      document.addEventListener('touchend', handleDragEnd, { once: true })

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove)
        document.removeEventListener('touchmove', handleGlobalTouchMove)
        document.removeEventListener('mouseup', handleDragEnd)
        document.removeEventListener('touchend', handleDragEnd)
      }
    }
  }, [isDragging, draggedNodeId, node.id, dispatch, node.size])

  const isBeingDragged = isDragging && draggedNodeId === node.id

  return (
    <div
      ref={nodeRef}
      className={`${styles.node} ${isBeingDragged ? styles.dragging : ''} ${isSelected ? styles.selected : ''}`}
      style={{
        left: node.position.x,
        top: node.position.y,
        width: node.size?.width || 200,
        borderColor: getStatusColor(node.status),
        opacity: isBeingDragged ? 0.7 : 1,
        transform: isBeingDragged ? 'scale(1.05)' : 'scale(1)',
        zIndex: isBeingDragged ? 1000 : (node.zIndex || 1),
        backgroundColor: isSelected ? '#f0f9ff' : '#ffffff',
        boxShadow: isSelected ? '0 0 0 2px #3b82f6, 0 4px 6px -1px rgba(0, 0, 0, 0.1)' : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
      data-node-id={node.id}
    >
      {/* Индикатор выделения */}
      {isSelected && (
        <div className={styles.selectionIndicator} />
      )}
      
      <div className={styles.header}>
        <div className={styles.titleContainer}>
          <span className={styles.typeIcon}>{getTypeIcon()}</span>
          
          {isEditingTitle ? (
            <input
              ref={titleRef}
              className={`${styles.titleInput} editable`}
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => handleKeyDown(e, 'title')}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <h4 
              className={`${styles.title} editable`}
              onClick={(e) => {
                e.stopPropagation()
                setIsEditingTitle(true)
              }}
            >
              {node.title}
            </h4>
          )}
          
          <span 
            className={styles.status}
            style={{ 
              backgroundColor: getStatusColor(node.status),
              color: '#fff',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '500',
            }}
            onClick={(e) => {
              e.stopPropagation()
              const statusOrder = ['todo', 'in-progress', 'done', 'blocked'] as const
              const currentIndex = statusOrder.indexOf(node.status)
              const nextIndex = (currentIndex + 1) % statusOrder.length
              dispatch(setTodoStatus({
                id: node.id,
                status: statusOrder[nextIndex]
              }))
            }}
          >
            {getStatusText(node.status)}
          </span>
        </div>
      </div>
      
      <div className={styles.content}>
        {isEditingDesc ? (
          <textarea
            className={`${styles.descriptionInput} editable`}
            value={editedDescription}
            onChange={(e) => setEditedDescription(e.target.value)}
            onBlur={handleDescriptionBlur}
            onKeyDown={(e) => handleKeyDown(e, 'desc')}
            placeholder="Введите описание..."
            onClick={(e) => e.stopPropagation()}
            rows={3}
          />
        ) : (
          <p 
            className={`${styles.description} editable`}
            onClick={handleDescriptionClick}
          >
            {node.description || (
              <span className={styles.placeholder}>Кликните для добавления описания...</span>
            )}
          </p>
        )}
      </div>
      
      <div className={styles.footer}>
        <div className={styles.priorityContainer}>
          <span 
            className={styles.priority}
            style={{ color: getPriorityColor(node.priority) }}
            onClick={(e) => {
              e.stopPropagation()
              const priorityOrder = ['low', 'medium', 'high', 'critical'] as const
              const currentIndex = priorityOrder.indexOf(node.priority)
              const nextIndex = (currentIndex + 1) % priorityOrder.length
              dispatch(setTodoPriority({
                id: node.id,
                priority: priorityOrder[nextIndex]
              }))
            }}
          >
            Приоритет: {node.priority === 'critical' ? 'Критический' : 
                       node.priority === 'high' ? 'Высокий' : 
                       node.priority === 'medium' ? 'Средний' : 'Низкий'}
          </span>
        </div>
        
        <div className={styles.metadata}>
          {node.dueDate && (
            <span 
              className={styles.dueDate}
              onClick={(e) => {
                e.stopPropagation()
                console.log('Change due date')
              }}
            >
              📅 {new Date(node.dueDate).toLocaleDateString()}
            </span>
          )}
          
          <span className={styles.createdDate}>
            📌 {new Date(node.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
      
      {node.tags && node.tags.length > 0 && (
        <div className={styles.tags}>
          {node.tags.slice(0, 3).map(tag => (
            <span 
              key={tag} 
              className={styles.tag}
              onClick={(e) => {
                e.stopPropagation()
                dispatch(removeTodoTag({ id: node.id, tag }))
              }}
            >
              {tag}
              <span className={styles.removeTag}>×</span>
            </span>
          ))}
          {node.tags.length > 3 && (
            <span className={styles.moreTags}>+{node.tags.length - 3}</span>
          )}
        </div>
      )}
      
      {/* Индикатор перемещения */}
      <div 
        className={styles.dragHandle}
        onMouseDown={(e) => {
          if (nodeRef.current) {
            const rect = nodeRef.current.getBoundingClientRect()
            handleDragStart(node.id, e, rect)
          }
        }}
      >
        ⋮⋮
      </div>
      
      {/* Кнопка быстрых действий */}
      <div className={styles.quickActions}>
        <button
          className={styles.quickAction}
          onClick={(e) => {
            e.stopPropagation()
            dispatch(setTodoStatus({
              id: node.id,
              status: 'done'
            }))
          }}
          title="Отметить выполненным"
        >
          ✓
        </button>
        <button
          className={styles.quickAction}
          onClick={(e) => {
            e.stopPropagation()
            dispatch(duplicateTodo(node.id))
          }}
          title="Дублировать"
        >
          📄
        </button>
      </div>
    </div>
  )
}