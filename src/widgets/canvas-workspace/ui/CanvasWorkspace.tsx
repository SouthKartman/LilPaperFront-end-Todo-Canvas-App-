// src/widgets/canvas-workspace/ui/CanvasWorkspace.tsx
import React, { useEffect, useCallback, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'
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

// Импорты для изображений
import { 
  selectCurrentCanvasImagesArray,
  selectSelectedImageNodes 
} from '@features/image-upload/model/selectors'
import { 
  clearImageSelection,
  selectImageNode,
  deselectImageNode 
} from '@features/image-upload/model/slice'
import { ImageNode } from '@features/image-upload/ui/ImageNode'
import { useImageDrop } from '@features/image-upload/lib/useImageDrop'
import { useImageUpload } from '@features/image-upload/lib/useImageUpload'
import { ImageDropOverlay } from '@features/image-upload/ui/ImageDropOverlay'

// Импортируем ImageNode как тип
import { ImageNode as ImageNodeType } from '@entities/image/model/types'

import {
  selectCurrentCanvas,
  selectCurrentCanvasViewport,
  selectCurrentCanvasGrid,
  selectCurrentCanvasBackground,
  selectCurrentPage
} from '@features/project-management/model/selectors'

import { updateCanvas } from '@features/project-management/model/slice'

// Импортируем хук для viewport
import { useEnhancedViewport } from '@features/canvas-viewport/lib/useTransformViewport'

// Импортируем сервис превью
import { previewService } from '@features/canvas-preview/lib/previewService'

export const CanvasWorkspace: React.FC = () => {
  // Получаем projectId из URL
  const { projectId } = useParams()
  
  const { nodes } = useTodoNodes()
  const { dragState, isDragging } = useCanvasDnd()
  const dispatch = useDispatch()
  const canvasRef = useRef<HTMLDivElement>(null)
  const lastUpdateRef = useRef<number>(0)
  const saveTimeoutRef = useRef<NodeJS.Timeout>()
  const [isSaving, setIsSaving] = useState(false)
  const isGeneratingPreview = useRef(false) // 👈 Добавляем ref для предотвращения множественных генераций
  
  const todoNodes = useSelector(selectAllTodoNodes)
  const selectedNodes = useSelector(selectSelectedTodoNodes)
  
  // Изображения для текущего полотна
  const imageNodes = useSelector(selectCurrentCanvasImagesArray)
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

  // Хуки для работы с изображениями
  const {
    isDraggingOver: isDraggingImage,
    dropError: imageDropError,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    clearError: clearImageError,
  } = useImageDrop()
  
// Добавьте этот useEffect

useEffect(() => {
  if (canvasRef.current) {
    // Принудительно устанавливаем размеры
    canvasRef.current.style.minWidth = '800px';
    canvasRef.current.style.minHeight = '400px';
  }
}, []);

  // Хук для загрузки изображений
  const { uploadImages, uploadingImages, justUploadedIds } = useImageUpload()

  // 👇 Функция сохранения проекта и генерации превью
  const saveProject = useCallback(async () => {
  if (!projectId || !canvasRef.current) return

  setIsSaving(true)
  console.log('💾 Сохранение проекта:', projectId)

  try {
    // Сохраняем viewport
    if (currentCanvas) {
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

    // Генерируем превью только если прошло больше 10 секунд с последней генерации
    const stats = previewService.getStats();
    const lastGen = localStorage.getItem(`last_preview_${projectId}`);
    const now = Date.now();
    
    if (!lastGen || now - parseInt(lastGen) > 10000) { // 10 секунд
      console.log('📸 Генерация превью (прошло >10с)');
      localStorage.setItem(`last_preview_${projectId}`, now.toString());
      
      const previewUrl = await previewService.generateProjectPreview(projectId);
      if (previewUrl) {
        console.log('✅ Превью сгенерировано');
      }
    } else {
      console.log('⏳ Пропускаем генерацию превью (слишком часто)');
    }

    console.log('✅ Проект сохранен')
  } catch (error) {
    console.error('❌ Ошибка сохранения:', error)
  } finally {
    setIsSaving(false)
  }
}, [projectId, currentCanvas, viewport, dispatch])

// Увеличиваем debounce до 5 секунд
const debouncedSave = useCallback(() => {
  if (saveTimeoutRef.current) {
    clearTimeout(saveTimeoutRef.current)
  }
  saveTimeoutRef.current = setTimeout(() => {
    saveProject()
  }, 5000) // 5 секунд вместо 3
}, [saveProject])

  // БЛОКИРОВКА МАСШТАБИРОВАНИЯ БРАУЗЕРА
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

    document.addEventListener('keydown', preventBrowserZoom, { passive: false })
    document.addEventListener('wheel', preventWheelZoom, { passive: false })

    return () => {
      document.removeEventListener('keydown', preventBrowserZoom)
      document.removeEventListener('wheel', preventWheelZoom)
    }
  }, [])

  // Эффект для перемещения ноды с throttle
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
    
    debouncedSave()
  }, [isDragging, dragState?.draggedNodeId, dragState?.currentPosition?.x, dragState?.currentPosition?.y, dragState?.offset?.x, dragState?.offset?.y, viewport, todoNodes, dispatch, debouncedSave])

  // Сохраняем изменения viewport в полотне
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
      
      debouncedSave()
    }
  }, [viewport, currentCanvas, canvasViewport, dispatch, debouncedSave])

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
    debouncedSave()
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

  // Обработчик drop для изображений
  const handleCanvasDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!currentCanvas) {
      console.warn('Нет текущего полотна для добавления изображения')
      return
    }
    
    const canvasPosition = convertScreenToCanvas(e.clientX, e.clientY)
    
    const files = Array.from(e.dataTransfer.files)
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    
    if (imageFiles.length === 0) return
    
    await uploadImages(imageFiles, canvasPosition)
    handleDrop(e, canvasPosition)
    debouncedSave()
  }, [convertScreenToCanvas, handleDrop, currentCanvas, uploadImages, debouncedSave])

  // Обработчики глобальных событий
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

  // Блокировка скролла при перетаскивании
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

  // Фильтрация задач по текущему полотну
  const currentCanvasNodes = React.useMemo(() => {
    if (!currentCanvas) return []
    
    return todoNodes.filter((node: any) => 
      currentCanvas.nodes.includes(node.id)
    )
  }, [todoNodes, currentCanvas])

  return (
    <div className={styles.workspace}>
      {/* Индикатор сохранения */}
      {isSaving && (
        <div className={styles.savingIndicator}>
          <span className={styles.spinner} />
          Saving preview...
        </div>
      )}

      <div 
        ref={canvasRef}
        className={`${styles.canvas} ${viewport.isPanning ? styles.panning : ''}`}
        style={{ background: canvasBackground }}
        data-project-id={projectId}
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

          {/* Рендер загружаемых изображений */}
          {uploadingImages.map((tempNode) => {
            const tempImageNode: ImageNodeType = {
              id: tempNode.tempId,
              type: 'image',
              position: tempNode.position,
              size: tempNode.size,
              zIndex: 1000,
              filePath: '',
              originalName: tempNode.originalName,
              fileSize: tempNode.fileSize,
              mimeType: tempNode.mimeType,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              pageId: currentPage?.id || 'default',
            };
            
            return (
              <ImageNode
                key={tempNode.tempId}
                node={tempImageNode}
                isUploading={true}
                uploadProgress={tempNode.progress}
                viewport={viewport}
                isSelected={false}
              />
            );
          })}

          {/* Рендер готовых изображений */}
          {imageNodes.map((node: any) => (
            <ImageNode
              key={node.id}
              node={node}
              isSelected={selectedImageNodes.some(n => n.id === node.id)}
              viewport={viewport}
              skipLoading={justUploadedIds.has(node.id)}
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
      
      <div className={styles.hotkeyHint}>
        Ctrl+колесо — масштаб • Колесо — панорамирование • Alt+ЛКМ — панорамирование • Перетащите изображения для загрузки
      </div>
    </div>
  )
}