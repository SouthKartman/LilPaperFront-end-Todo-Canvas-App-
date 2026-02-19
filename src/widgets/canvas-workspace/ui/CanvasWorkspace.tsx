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

// Импорты для изображений - ИСПРАВЛЕНО!
import { 
  selectCurrentCanvasImagesArray,  // ✅ Вместо selectAllImageNodes
  selectSelectedImageNodes 
} from '@features/image-upload/model/selectors'
import { 
  clearImageSelection,
  selectImageNode,
  deselectImageNode 
} from '@features/image-upload/model/slice'
import { ImageNode } from '@features/image-upload/ui/ImageNode'
import { useImageDrop } from '@features/image-upload/lib/useImageDrop'
import { ImageDropOverlay } from '@features/image-upload/ui/ImageDropOverlay'
import { ImageUploadButton } from '@features/image-upload/ui/ImageUploadButton'

import {
  selectCurrentCanvas,
  selectCurrentCanvasViewport,
  selectCurrentCanvasGrid,
  selectCurrentCanvasBackground,
  selectCurrentPage
} from '@features/project-management/model/selectors'

import { updateCanvas } from '@features/project-management/model/slice'
import { useEnhancedViewport } from '@features/canvas-viewport/lib/useTransformViewport'

export const CanvasWorkspace: React.FC = () => {
  const { nodes } = useTodoNodes()
  const { dragState, isDragging } = useCanvasDnd()
  const dispatch = useDispatch()
  const canvasRef = useRef<HTMLDivElement>(null)
  const lastUpdateRef = useRef<number>(0)
  
  const todoNodes = useSelector(selectAllTodoNodes)
  const selectedNodes = useSelector(selectSelectedTodoNodes)
  
  // ✅ ИСПРАВЛЕНО: используем селектор для текущего полотна
  const imageNodes = useSelector(selectCurrentCanvasImagesArray)  // Только для текущего canvas!
  const selectedImageNodes = useSelector(selectSelectedImageNodes)
  
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

  // Хук для DnD изображений
  const {
    isDraggingOver: isDraggingImage,
    dropError: imageDropError,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    clearError: clearImageError,
  } = useImageDrop()

  // БЛОКИРОВКА МАСШТАБИРОВАНИЯ БРАУЗЕРА (без изменений)
  useEffect(() => {
    const preventBrowserZoom = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) {
        e.preventDefault()
      }
    }

    const preventWheelZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
      }
    }

    const preventGestureZoom = (e: Event) => {
      e.preventDefault()
    }

    document.addEventListener('keydown', preventBrowserZoom, { passive: false })
    document.addEventListener('wheel', preventWheelZoom, { passive: false })
    document.addEventListener('gesturestart', preventGestureZoom, { passive: false })
    document.addEventListener('gesturechange', preventGestureZoom, { passive: false })
    document.addEventListener('gestureend', preventGestureZoom, { passive: false })

    return () => {
      document.removeEventListener('keydown', preventBrowserZoom)
      document.removeEventListener('wheel', preventWheelZoom)
      document.removeEventListener('gesturestart', preventGestureZoom)
      document.removeEventListener('gesturechange', preventGestureZoom)
      document.removeEventListener('gestureend', preventGestureZoom)
    }
  }, [])

  // Эффект для перемещения ноды с throttle (без изменений)
  useEffect(() => {
    if (!isDragging || !dragState?.draggedNodeId || !dragState?.currentPosition || !canvasRef.current) {
      return
    }
    
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
  }, [isDragging, dragState?.draggedNodeId, dragState?.currentPosition?.x, dragState?.currentPosition?.y, dragState?.offset?.x, dragState?.offset?.y, viewport, todoNodes, dispatch])

  // Сохраняем изменения viewport в полотне (без изменений)
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

  // Обработчик drop для изображений - ИСПРАВЛЕНО с проверкой canvas
  const handleCanvasDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!currentCanvas) {
      console.warn('Нет текущего полотна для добавления изображения')
      return
    }
    
    const canvasPosition = convertScreenToCanvas(e.clientX, e.clientY)
    handleDrop(e, canvasPosition)
  }, [convertScreenToCanvas, handleDrop, currentCanvas])

  // Обработчики глобальных событий (без изменений)
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

  // Блокировка скролла при перетаскивании (без изменений)
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

  // Фильтрация задач по текущему полотну (без изменений)
  const currentCanvasNodes = React.useMemo(() => {
    if (!currentCanvas) return []
    
    return todoNodes.filter((node: any) => 
      currentCanvas.nodes.includes(node.id)
    )
  }, [todoNodes, currentCanvas])

  // ✅ Добавим логирование для отладки
  useEffect(() => {
    console.log(`🎨 Текущее полотно: ${currentCanvas?.id || 'нет'}`)
    console.log(`🖼️ Изображений на полотне: ${imageNodes.length}`)
  }, [currentCanvas, imageNodes])

  return (
    <div className={styles.workspace}>
      <div 
        ref={canvasRef}
        className={`${styles.canvas} ${viewport.isPanning ? styles.panning : ''}`}
        style={{ background: canvasBackground }}
        onWheel={handleWheel}
        onMouseDown={handlePanStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleCanvasDrop}
        onClick={(e) => {
          if (e.button === 0 && !e.altKey && !isDragging) {
            dispatch(todoNodesActions.clearSelection())
            dispatch(clearImageSelection())
          }
        }}
        onDoubleClick={handleCanvasDoubleClick}
        onContextMenu={handleCanvasContextMenu}
      >
        {/* Сетка */}
        {viewport.showGrid && (
          <div 
            className={styles.grid}
            style={{
              backgroundImage: `linear-gradient(90deg, #e0e0e0 1px, transparent 1px),
                linear-gradient(#e0e0e0 1px, transparent 1px)`,
              backgroundSize: `${viewport.gridSize * viewport.scale}px ${viewport.gridSize * viewport.scale}px`,
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
          {/* Рендер задач */}
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
                } else {
                  dispatch(todoNodesActions.clearSelection())
                  dispatch(clearImageSelection())
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

          {/* ✅ Рендер изображений - теперь только для текущего полотна */}
          {imageNodes.map((node: any) => (
            <ImageNode
              key={node.id}
              node={node}
              isSelected={selectedImageNodes.some(n => n.id === node.id)}
              viewport={viewport}
              onContextMenu={(e, nodeId) => {
                e.preventDefault()
                e.stopPropagation()
                
                const menuItems = [
                  { label: 'Удалить', action: 'delete' },
                  { label: 'Связать с задачей', action: 'link' },
                ]
                
                dispatch(showMenu({
                  x: e.clientX,
                  y: e.clientY,
                  items: menuItems,
                  context: { nodeId, type: 'image' },
                }))
              }}
              onClick={(e, nodeId) => {
                e.stopPropagation()
                
                if (e.ctrlKey || e.metaKey) {
                  if (selectedImageNodes.some(n => n.id === nodeId)) {
                    dispatch(deselectImageNode(nodeId))
                  } else {
                    dispatch(selectImageNode(nodeId))
                  }
                } else {
                  dispatch(todoNodesActions.clearSelection())
                  dispatch(clearImageSelection())
                  dispatch(selectImageNode(nodeId))
                }
              }}
              onDoubleClick={(e, nodeId) => {
                e.stopPropagation()
                console.log('Open image fullscreen:', nodeId)
              }}
            />
          ))}
        </div>

        {/* Preview при перетаскивании задач */}
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

        {/* Оверлей для DnD изображений */}
        <ImageDropOverlay 
          isVisible={isDraggingImage} 
          error={imageDropError}
          onClearError={clearImageError}
        />
      </div>
      
      <ContextMenu />
      <QuickTodoForm />
      <TodoFormModal />
      
      {/* Кнопка загрузки изображений - добавим */}
      <div style={{
        position: 'absolute',
        bottom: '80px',
        right: '20px',
        zIndex: 5,
      }}>
        <ImageUploadButton />
      </div>
      
      {/* Панель управления */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        zIndex: 5,
        display: 'flex',
        gap: '8px',
        background: 'white',
        padding: '8px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        {/* Здесь могут быть другие элементы управления */}
      </div>
      
      <div className={styles.hotkeyHint}>
        Ctrl+колесо — масштаб • Колесо — панорамирование • Alt+ЛКМ — панорамирование • Перетащите изображения для загрузки
      </div>
    </div>
  )
}