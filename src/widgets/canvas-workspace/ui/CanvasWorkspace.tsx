import React, { useEffect, useCallback, useRef } from 'react'
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

import {
  selectCurrentCanvas,
  selectCurrentCanvasViewport,
  selectCurrentCanvasGrid,
  selectCurrentCanvasBackground,
  selectCurrentPage
} from '@features/project-management/model/selectors'

import { updateCanvas } from '@features/project-management/model/slice'
import { useEnhancedViewport } from '@features/canvas-viewport/lib/useTransformViewport'
import { ZoomControls } from '@features/canvas-viewport/ui/ZoomControls'

export const CanvasWorkspace: React.FC = () => {
  const { nodes } = useTodoNodes()
  const { dragState, isDragging } = useCanvasDnd()
  const dispatch = useDispatch()
  const canvasRef = useRef<HTMLDivElement>(null)
  const lastUpdateRef = useRef<number>(0) // 👈 Добавляем для throttle
  
  const todoNodes = useSelector(selectAllTodoNodes)
  const selectedNodes = useSelector(selectSelectedTodoNodes)
  const { openQuickForm, openForm } = useTodoForm()

  const currentPage = useSelector(selectCurrentPage)
  const currentCanvas = useSelector(selectCurrentCanvas)
  const canvasViewport = useSelector(selectCurrentCanvasViewport)
  const canvasGrid = useSelector(selectCurrentCanvasGrid)
  const canvasBackground = useSelector(selectCurrentCanvasBackground)

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
  } = useEnhancedViewport()

  // 🆕 ИСПРАВЛЕННЫЙ useEffect с throttle
  useEffect(() => {
    if (!isDragging || !dragState?.draggedNodeId || !dragState?.currentPosition || !canvasRef.current) {
      return
    }
    
    // Throttle - обновляем не чаще чем раз в 16ms (~60fps)
    const now = Date.now()
    if (now - lastUpdateRef.current < 16) {
      return
    }
    lastUpdateRef.current = now
    
    const rect = canvasRef.current.getBoundingClientRect()
    
    const mouseX = dragState.currentPosition.x - dragState.offset.x
    const mouseY = dragState.currentPosition.y - dragState.offset.y
    
    const relativeX = mouseX - rect.left
    const relativeY = mouseY - rect.top
    
    const canvasX = (relativeX - viewport.position.x) / viewport.scale
    const canvasY = (relativeY - viewport.position.y) / viewport.scale
    
    const node = todoNodes.find(n => n.id === dragState.draggedNodeId)
    if (!node) return
    
    const nodeWidth = node.size?.width || 200
    const nodeHeight = node.size?.height || 150
    
    dispatch(todoNodesActions.moveTodo({
      id: dragState.draggedNodeId,
      position: {
        x: canvasX - nodeWidth / 2,
        y: canvasY - nodeHeight / 2,
      }
    }))
  }, [isDragging, dragState?.draggedNodeId, dragState?.currentPosition?.x, dragState?.currentPosition?.y, dragState?.offset?.x, dragState?.offset?.y, viewport, todoNodes])

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

  const convertScreenToCanvas = useCallback((screenX: number, screenY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 }
    
    const rect = canvasRef.current.getBoundingClientRect()
    const relativeX = screenX - rect.left
    const relativeY = screenY - rect.top
    
    const canvasX = (relativeX - viewport.position.x) / viewport.scale
    const canvasY = (relativeY - viewport.position.y) / viewport.scale
    
    return { x: canvasX, y: canvasY }
  }, [viewport])

  const handleCreateNode = (position: { x: number; y: number }, title: string = 'Новая задача') => {
    dispatch(todoNodesActions.createTodoAtPosition({
      position,
      title,
      priority: 'medium',
    }))
  }

  const handleCanvasContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
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
  }

  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const canvasPosition = convertScreenToCanvas(e.clientX, e.clientY)
    handleCreateNode(canvasPosition, 'Новая задача')
  }

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

  const currentCanvasNodes = React.useMemo(() => {
    if (!currentCanvas) return []
    
    return todoNodes.filter((node: any) => 
      currentCanvas.nodes.includes(node.id)
    )
  }, [todoNodes, currentCanvas])

  return (
    <div className={styles.workspace}>
      <div 
        ref={canvasRef}
        className={`${styles.canvas} ${viewport.isPanning ? styles.panning : ''}`}
        style={{ background: canvasBackground }}
        onWheel={handleWheel}
        onMouseDown={handlePanStart}
        onClick={(e) => {
          if (e.button === 0 && !e.altKey && !isDragging) {
            dispatch(todoNodesActions.clearSelection())
          }
        }}
        onDoubleClick={handleCanvasDoubleClick}
        onContextMenu={handleCanvasContextMenu}
      >
        {canvasGrid.isVisible && (
          <div 
            className={styles.grid}
            style={{
              backgroundImage: `linear-gradient(90deg, #e0e0e0 1px, transparent 1px),
                linear-gradient(#e0e0e0 1px, transparent 1px)`,
              backgroundSize: `${canvasGrid.size * viewport.scale}px ${canvasGrid.size * viewport.scale}px`,
              backgroundPosition: `${viewport.position.x}px ${viewport.position.y}px`,
            }}
          />
        )}
        
        <div 
          className={styles.content}
          style={{
            transform: `translate(${viewport.position.x}px, ${viewport.position.y}px) scale(${viewport.scale})`,
          }}
        >
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

        {isDragging && dragState?.draggedNodeId && (
          <div
            className={styles.dragPreview}
            style={{
              left: dragState.currentPosition.x - dragState.offset.x,
              top: dragState.currentPosition.y - dragState.offset.y,
              transform: 'none',
              position: 'fixed',
            }}
          >
            Перемещение...
          </div>
        )}
      </div>
      
      <ContextMenu />
      <QuickTodoForm />
      <TodoFormModal />
      
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
      
      
      
      <div className={styles.hotkeyHint}>
        Ctrl+колесо — масштаб • Колесо — панорамирование • Alt+ЛКМ — панорамирование
      </div>
    </div>
  )
}