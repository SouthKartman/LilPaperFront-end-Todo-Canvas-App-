// src/widgets/canvas-workspace/ui/CanvasWorkspace.tsx
import React, { useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTodoNodes } from '@features/todo-nodes/lib/useTodoNode'
import { TodoNode } from '@features/todo-nodes/ui/TodoNode/TodoNode'
import { useCanvasDnd } from '@features/canvas-dnd/lib/useCanvasDnd'
import { ContextMenu } from '@features/node-creations/ui/ContextMenu'
import { showMenu } from '@features/node-creations/model/slice'
import { createNodeContextMenu, createCanvasContextMenu } from '@features/node-creations/lib/contextMenuHelpers'
import { todoNodesActions } from '@features/todo-nodes/model/slice'
import { selectAllTodoNodes, selectSelectedTodoNodes } from '@features/todo-nodes/model/selectors'
import { useTodoForm } from '@features/todo-form/lib/useTodoForm'
import { QuickTodoForm } from '@features/todo-form/ui/QuickTodoForm'
import { TodoFormModal } from '@features/todo-form/ui/TodoFormModal'
import styles from './CanvasWorkspace.module.css'
import { RootState } from '@shared/lib/state/store'

// 🆕 Импортируем селекторы для полотна
import {
  selectCurrentCanvas,
  selectCurrentCanvasViewport,
  selectCurrentCanvasGrid,
  selectCurrentCanvasBackground,
  selectCurrentPage
} from '@features/project-management/model/selectors'

// 🆕 Импортируем экшены для обновления полотна
import { updateCanvas } from '@features/project-management/model/slice'

// Импортируем новый хук для viewport
import { useEnhancedViewport } from '@features/canvas-viewport/lib/useTransformViewport'
import { ZoomControls } from '@features/canvas-viewport/ui/ZoomControls'

export const CanvasWorkspace: React.FC = () => {
  const { nodes } = useTodoNodes()
  const { dragState, isDragging } = useCanvasDnd()
  const dispatch = useDispatch()
  
  const todoNodes = useSelector(selectAllTodoNodes)
  const selectedNodes = useSelector(selectSelectedTodoNodes)
  const { openQuickForm, openForm } = useTodoForm()

  // 🆕 Получаем данные текущего полотна
  const currentPage = useSelector(selectCurrentPage)
  const currentCanvas = useSelector(selectCurrentCanvas)
  const canvasViewport = useSelector(selectCurrentCanvasViewport)
  const canvasGrid = useSelector(selectCurrentCanvasGrid)
  const canvasBackground = useSelector(selectCurrentCanvasBackground)

  // 🆕 Используем viewport с настройками из полотна
  const {
    viewport,
    handleWheel,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    handleKeyDown,
    handleZoomIn,
    handleZoomOut,
    handleResetViewport,
    handleToggleGrid,
    getTransformStyle,
    getGridStyle,
  } = useEnhancedViewport({
    initialViewport: canvasViewport,
    initialGrid: canvasGrid,
  })

  // 🆕 Сохраняем изменения viewport в полотне
  useEffect(() => {
    if (currentCanvas && 
        (viewport.position.x !== canvasViewport.x || 
         viewport.position.y !== canvasViewport.y || 
         viewport.scale !== canvasViewport.zoom)) {
      
      dispatch(updateCanvas({
        canvasId: currentCanvas.id,
        updates: {
          viewport: {
            x: viewport.position.x,
            y: viewport.position.y,
            zoom: viewport.scale,
          },
        },
      }))
    }
  }, [viewport, currentCanvas, canvasViewport, dispatch])

  // 🆕 Сохраняем изменения сетки в полотне
  const handleGridChange = useCallback((newGrid: typeof canvasGrid) => {
    if (currentCanvas) {
      dispatch(updateCanvas({
        canvasId: currentCanvas.id,
        updates: { grid: newGrid },
      }))
    }
  }, [currentCanvas, dispatch])

  // 🆕 Сохраняем изменения фона в полотне
  const handleBackgroundChange = useCallback((newBackground: string) => {
    if (currentCanvas) {
      dispatch(updateCanvas({
        canvasId: currentCanvas.id,
        updates: { background: newBackground },
      }))
    }
  }, [currentCanvas, dispatch])

  // Конвертация координат с учетом viewport
  const convertScreenToCanvas = (screenX: number, screenY: number, element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    const relativeX = screenX - rect.left
    const relativeY = screenY - rect.top
    
    // Конвертируем с учетом зума и панорамирования
    const canvasX = (relativeX - viewport.position.x) / viewport.scale
    const canvasY = (relativeY - viewport.position.y) / viewport.scale
    
    return { x: canvasX, y: canvasY }
  }

  // 🆕 Обработчик создания ноды с привязкой к текущему полотну
  const handleCreateNode = (position: { x: number; y: number }, title: string = 'Новая задача') => {
    dispatch(todoNodesActions.createTodoAtPosition({
      position,
      title,
      priority: 'medium',
    }))
    
    // Нода автоматически добавится на полотно через middleware
  }

  const handleCanvasContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    const canvasPosition = convertScreenToCanvas(e.clientX, e.clientY, e.currentTarget)
    const menuItems = createCanvasContextMenu(canvasPosition)
    
    dispatch(showMenu({
      x: e.clientX,
      y: e.clientY,
      items: menuItems,
      context: { position: canvasPosition },
    }))
  }

  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const canvasPosition = convertScreenToCanvas(e.clientX, e.clientY, e.currentTarget)
    handleCreateNode(canvasPosition, 'Новая задача')
  }

  // Глобальные обработчики для панорамирования
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      handlePanMove(e)
    }
    
    const handleGlobalMouseUp = () => {
      handlePanEnd()
      document.body.style.cursor = ''
    }
    
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      handleKeyDown(e)
    }
    
    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)
    document.addEventListener('keydown', handleGlobalKeyDown)
    
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
      document.removeEventListener('keydown', handleGlobalKeyDown)
    }
  }, [handlePanMove, handlePanEnd, handleKeyDown])

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

  // 🆕 Фильтруем ноды для текущего полотна
  const currentCanvasNodes = React.useMemo(() => {
    if (!currentCanvas) return []
    
    return nodes.filter((node: any) => 
      currentCanvas.nodes.includes(node.id)
    )
  }, [nodes, currentCanvas])

  return (
    <div className={styles.workspace}>
      <div 
        className={styles.canvas}
        style={{ background: canvasBackground }} // 🆕 Используем фон из полотна
        onWheel={handleWheel}
        onMouseDown={handlePanStart}
        onClick={(e) => {
          if (e.button === 0 && !e.altKey) {
            dispatch(todoNodesActions.clearSelection())
          }
        }}
        onDoubleClick={handleCanvasDoubleClick}
        onContextMenu={handleCanvasContextMenu}
      >
        {/* Сетка с учетом viewport */}
        {canvasGrid.isVisible && (
          <div 
            className={styles.grid}
            style={getGridStyle}
          />
        )}
        
        {/* Контент с трансформацией */}
        <div 
          className={styles.content}
          style={getTransformStyle}
        >
          {/* Отображаем только ноды текущего полотна */}
          {currentCanvasNodes.map((node: any) => (
            <TodoNode 
              key={node.id} 
              node={node}
              onContextMenu={(e) => {
                e.preventDefault()
                e.stopPropagation()
                
                const menuItems = createNodeContextMenu()
                dispatch(showMenu({
                  x: e.clientX,
                  y: e.clientY,
                  items: menuItems,
                  context: { nodeId: node.id },
                }))
              }}
              onClick={(e, nodeId) => {
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
              }}
              onDoubleClick={(e, nodeId) => {
                e.stopPropagation()
                dispatch(todoNodesActions.startEditingTodo(nodeId))
              }}
              isSelected={selectedNodes.some(n => n.id === node.id)}
            />
          ))}
        </div>

        {/* Индикатор перетаскивания */}
        {isDragging && dragState?.draggedNodeId && (
          <div
            className={styles.dragPreview}
            style={{
              left: dragState.currentPosition.x - dragState.offset.x,
              top: dragState.currentPosition.y - dragState.offset.y,
              transform: `scale(${viewport.scale})`,
            }}
          >
            Перемещение...
          </div>
        )}
      </div>
      
      {/* Существующие компоненты */}
      <ContextMenu />
      <QuickTodoForm />
      <TodoFormModal />
      
      {/* 🆕 Кнопка создания задачи */}
      <button 
        onClick={() => {
          if (currentPage) {
            handleCreateNode({ x: 100, y: 100 }, 'Новая задача')
          }
        }}
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          zIndex: 5,
          padding: '10px',
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
        disabled={!currentPage}
      >
        Создать задачу
      </button>
      
      {/* 🆕 Управление полотном */}
      <div className={styles.canvasControls}>
        <ZoomControls 
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onReset={handleResetViewport}
          scale={viewport.scale}
        />
        <button 
          onClick={() => handleToggleGrid()}
          className={styles.gridToggle}
        >
          {canvasGrid.isVisible ? 'Скрыть сетку' : 'Показать сетку'}
        </button>
      </div>
      
      {/* Подсказки по горячим клавишам */}
      <div className={styles.hotkeyHint}>
        Ctrl+колесо — масштаб • Колесо — панорамирование • Alt+ЛКМ — панорамирование
      </div>
    </div>
  )
}