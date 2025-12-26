// src/widgets/canvas-workspace/ui/CanvasWorkspace.tsx
import React, { useEffect, useCallback, useRef, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTodoNodes } from '@features/todo-nodes/lib/useTodoNode'
import { TodoNode } from '@features/todo-nodes/ui/TodoNode/TodoNode'
import { useCanvasDnd } from '@features/canvas-dnd/lib/useCanvasDnd'
import { ContextMenu } from '@features/node-creations/ui/ContextMenu'
import { showMenu } from '@features/node-creations/model/slice'
import { createNodeContextMenu, createCanvasContextMenu } from '@features/node-creations/lib/contextMenuHelpers'
import { todoNodesActions } from '@features/todo-nodes/model/slice'
import { selectViewportTransform } from '@features/canvas-viewport/model/selectors'
import { selectAllTodoNodes, selectSelectedTodoNodes } from '@features/todo-nodes/model/selectors'
import { useTodoForm } from '@features/todo-form/lib/useTodoForm'
import { QuickTodoForm } from '@features/todo-form/ui/QuickTodoForm'
import { TodoFormModal } from '@features/todo-form/ui/TodoFormModal'
import styles from './CanvasWorkspace.module.css'
import { RootState } from '@shared/lib/state/store'
import { StorageManager } from '@features/storage/ui/StorageManager'

export const CanvasWorkspace: React.FC = () => {
  const { nodes } = useTodoNodes()
  const { dragState, isDragging } = useCanvasDnd()
  const dispatch = useDispatch()
  const canvasRef = useRef<HTMLDivElement>(null)
  
  const todoNodes = useSelector(selectAllTodoNodes)
  const selectedNodes = useSelector(selectSelectedTodoNodes)
  const viewportTransform = useSelector(selectViewportTransform)
  const { openQuickForm, openForm } = useTodoForm()

  // Конвертация координат экрана в координаты канваса
  const convertScreenToCanvas = useCallback((screenX: number, screenY: number) => {
    const canvasRect = canvasRef.current?.getBoundingClientRect()
    if (!canvasRect || !viewportTransform) return { x: 0, y: 0 }
    
    const relativeX = screenX - canvasRect.left
    const relativeY = screenY - canvasRect.top
    
    // Конвертируем с учетом зума и панорамирования
    const canvasX = (relativeX - viewportTransform.x) / viewportTransform.zoom
    const canvasY = (relativeY - viewportTransform.y) / viewportTransform.zoom
    
    return { x: canvasX, y: canvasY }
  }, [viewportTransform])

  // Мемоизируем обработчики, чтобы не создавать новые функции при каждом рендере
  const memoizedHandlers = useMemo(() => ({
    // Обработчик контекстного меню для канваса
    handleCanvasContextMenu: (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      
      const canvasPosition = convertScreenToCanvas(e.clientX, e.clientY)
      const menuItems = createCanvasContextMenu(canvasPosition)
      
      dispatch(showMenu({
        x: e.clientX,
        y: e.clientY,
        items: menuItems,
        context: { position: canvasPosition },
      }))
    },

    // Обработчик контекстного меню для ноды
    handleNodeContextMenu: (e: React.MouseEvent, nodeId: string) => {
      e.preventDefault()
      e.stopPropagation()
      
      const menuItems = createNodeContextMenu(nodeId)
      
      dispatch(showMenu({
        x: e.clientX,
        y: e.clientY,
        items: menuItems,
        context: { nodeId },
      }))
    },

    // Обработчик клика по ноде для выделения
    handleNodeClick: (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation()
      
      if (e.ctrlKey || e.metaKey) {
        const isSelected = selectedNodes.some(n => n.id === nodeId)
        if (isSelected) {
          dispatch(todoNodesActions.deselectNode(nodeId))
        } else {
          dispatch(todoNodesActions.selectNode(nodeId))
        }
      } else if (e.shiftKey) {
        dispatch(todoNodesActions.selectNode(nodeId))
      } else {
        dispatch(todoNodesActions.clearSelection())
        dispatch(todoNodesActions.selectNode(nodeId))
      }
    },

    // Обработчик клика по канвасу для снятия выделения
    handleCanvasClick: (e: React.MouseEvent) => {
      if (e.button === 0) {
        if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
          dispatch(todoNodesActions.clearSelection())
        }
      }
    },

    // Обработчик двойного клика по канвасу для быстрого создания
    handleCanvasDoubleClick: (e: React.MouseEvent<HTMLDivElement>) => {
      const canvasPosition = convertScreenToCanvas(e.clientX, e.clientY)
      
      dispatch(todoNodesActions.createTodoAtPosition({
        position: canvasPosition,
        type: 'default',
        title: 'Новая задача',
        priority: 'medium',
      }))
    },

    // Обработчик двойного клика по ноде для редактирования
    handleNodeDoubleClick: (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation()
      dispatch(todoNodesActions.startEditingTodo(nodeId))
    },
  }), [dispatch, convertScreenToCanvas, selectedNodes])

  // Обработчик клавиш
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N - создать новую задачу
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        const canvasRect = canvasRef.current?.getBoundingClientRect()
        if (canvasRect) {
          const centerX = canvasRect.left + canvasRect.width / 2
          const centerY = canvasRect.top + canvasRect.height / 2
          const canvasPosition = convertScreenToCanvas(centerX, centerY)
          
          dispatch(todoNodesActions.createTodoAtPosition({
            position: canvasPosition,
            type: 'default',
            title: 'Новая задача',
            priority: 'medium',
          }))
        }
      }
      
      // Ctrl+Shift+N - открыть форму создания
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault()
        openForm()
      }
      
      // Delete - удалить выделенные ноды
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodes.length > 0) {
        if (window.confirm(`Удалить ${selectedNodes.length} задач?`)) {
          selectedNodes.forEach(node => {
            dispatch(todoNodesActions.deleteTodo(node.id))
          })
        }
        e.preventDefault()
      }
      
      // Ctrl+A - выделить всё
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        const allNodeIds = todoNodes.map(node => node.id)
        allNodeIds.forEach(nodeId => {
          dispatch(todoNodesActions.selectNode(nodeId))
        })
      }
      
      // Ctrl+D - дублировать выделенные
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedNodes.length > 0) {
        e.preventDefault()
        selectedNodes.forEach(node => {
          dispatch(todoNodesActions.duplicateTodo(node.id))
        })
      }
      
      // Escape - снять выделение
      if (e.key === 'Escape' && selectedNodes.length > 0) {
        dispatch(todoNodesActions.clearSelection())
        e.preventDefault()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [dispatch, todoNodes, selectedNodes, convertScreenToCanvas, openForm])

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
    <div 
      className={styles.workspace}
      onClick={memoizedHandlers.handleCanvasClick}
    >
      <div 
        ref={canvasRef}
        className={styles.canvas}
        onContextMenu={memoizedHandlers.handleCanvasContextMenu}
        onDoubleClick={memoizedHandlers.handleCanvasDoubleClick}
      >
        <div className={styles.grid} />
        
        {/* Отображаем все ноды */}
        {nodes.map((node: any) => (
          <TodoNode 
            key={node.id} 
            node={node}
            onContextMenu={(e) => memoizedHandlers.handleNodeContextMenu(e, node.id)}
            onClick={(e) => memoizedHandlers.handleNodeClick(e, node.id)}
            onDoubleClick={(e) => memoizedHandlers.handleNodeDoubleClick(e, node.id)}
            isSelected={selectedNodes.some(n => n.id === node.id)}
          />
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
      
      {/* Глобальное контекстное меню (теперь из features/context-menu) */}
      <ContextMenu />
      
      {/* Быстрая форма создания задачи */}
      <QuickTodoForm />
      
      {/* Модальное окно с полной формой */}
      <TodoFormModal />
      
      {/* Кнопка для теста (опционально) */}
      <button 
        onClick={() => openQuickForm({ x: 100, y: 100 })}
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          zIndex: 10000,
          padding: '10px',
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Тест: Открыть форму
      </button>
      
      {/* Подсказки по горячим клавишам */}
      <div className={styles.hotkeyHint}>
        Двойной клик - создать задачу • Ctrl+N - новая задача • Ctrl+Shift+N - форма
      </div>
    </div>
  )
}