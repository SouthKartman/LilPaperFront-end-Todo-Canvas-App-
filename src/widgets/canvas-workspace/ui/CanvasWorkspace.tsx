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
import { FileService } from '@shared/lib/dom/fileService'

import { 
  selectCurrentCanvasImagesArray,
  selectSelectedImageNodes 
} from '@features/image-upload/model/selectors'
import { 
  clearImageSelection,
  selectImageNode,
  deselectImageNode,
  deleteImageNodes,
  addImageNode,
} from '@features/image-upload/model/slice'
import { ImageNode } from '@features/image-upload/ui/ImageNode'
import { useImageDrop } from '@features/image-upload/lib/useImageDrop'
import { useImageUpload } from '@features/image-upload/lib/useImageUpload'
import { ImageDropOverlay } from '@features/image-upload/ui/ImageDropOverlay'

import { ImageNode as ImageNodeType } from '@entities/image/model/types'

import {
  selectCurrentCanvas,
  selectCurrentCanvasViewport,
  selectCurrentCanvasGrid,
  selectCurrentCanvasBackground,
  selectCurrentPage
} from '@features/project-management/model/selectors'

import { updateCanvas } from '@features/project-management/model/slice'

import { useEnhancedViewport } from '@features/canvas-viewport/lib/useTransformViewport'

import { previewService } from '@features/canvas-preview/lib/previewService'

import { useSelection } from '@features/selection'

export const CanvasWorkspace: React.FC = () => {
  const { projectId } = useParams()
  
  const { nodes } = useTodoNodes()
  const { dragState, isDragging } = useCanvasDnd()
  const dispatch = useDispatch()
  const canvasRef = useRef<HTMLDivElement>(null)
  const lastUpdateRef = useRef<number>(0)
  const saveTimeoutRef = useRef<NodeJS.Timeout>()
  const [isSaving, setIsSaving] = useState(false)
  
  const todoNodes = useSelector(selectAllTodoNodes)
  const selectedNodes = useSelector(selectSelectedTodoNodes)
  
  const imageNodes = useSelector(selectCurrentCanvasImagesArray)
  const selectedImageNodes = useSelector(selectSelectedImageNodes)
  
  const { openQuickForm, openForm } = useTodoForm()

  const currentPage = useSelector(selectCurrentPage)
  const currentCanvas = useSelector(selectCurrentCanvas)
  const canvasViewport = useSelector(selectCurrentCanvasViewport)
  const canvasGrid = useSelector(selectCurrentCanvasGrid)
  const canvasBackground = useSelector(selectCurrentCanvasBackground)

  const { 
    selectedTodoIds,
    selectedImageIds,
    selectedCount,
    hasSelection,
    clearSelection,
  } = useSelection()

  const {
    viewport,
    handleWheel,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    handleKeyDown: handleViewportKeyDown,
    handleZoomIn,
    handleZoomOut,
    handleResetViewport,
    handleToggleGrid,
  } = useEnhancedViewport()

  const {
    isDraggingOver: isDraggingImage,
    dropError: imageDropError,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    clearError: clearImageError,
  } = useImageDrop()
  
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.style.minWidth = '800px';
      canvasRef.current.style.minHeight = '400px';
    }
  }, []);

  const { uploadImages, uploadingImages, justUploadedIds } = useImageUpload()

  const saveProject = useCallback(async () => {
    if (!projectId || !canvasRef.current) return

    setIsSaving(true)

    try {
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

      const lastGen = localStorage.getItem(`last_preview_${projectId}`);
      const now = Date.now();
      
      if (!lastGen || now - parseInt(lastGen) > 10000) {
        localStorage.setItem(`last_preview_${projectId}`, now.toString());
        await previewService.generateProjectPreview(projectId);
      }
    } catch (error) {
      console.error('❌ Ошибка сохранения:', error)
    } finally {
      setIsSaving(false)
    }
  }, [projectId, currentCanvas, viewport, dispatch])

  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => saveProject(), 5000)
  }, [saveProject])

  useEffect(() => {
    const preventBrowserZoom = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) {
        e.preventDefault()
      }
    }

    const preventWheelZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault()
    }

    document.addEventListener('keydown', preventBrowserZoom, { passive: false })
    document.addEventListener('wheel', preventWheelZoom, { passive: false })

    return () => {
      document.removeEventListener('keydown', preventBrowserZoom)
      document.removeEventListener('wheel', preventWheelZoom)
    }
  }, [])

  useEffect(() => {
    if (!isDragging || !dragState?.draggedNodeId || !dragState?.currentPosition || !canvasRef.current) return
    
    const now = Date.now()
    if (now - lastUpdateRef.current < 16) return
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
      position: { x: canvasX - nodeWidth / 2, y: canvasY - nodeHeight / 2 }
    }))
    
    debouncedSave()
  }, [isDragging, dragState, viewport, todoNodes, dispatch, debouncedSave])

  useEffect(() => {
    if (currentCanvas && 
        (viewport.position.x !== canvasViewport.x || 
         viewport.position.y !== canvasViewport.y || 
         viewport.scale !== canvasViewport.zoom)) {
      
      dispatch(updateCanvas({
        canvasId: currentCanvas.id,
        updates: {
          viewport: { x: viewport.position.x, y: viewport.position.y, zoom: viewport.scale },
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
    dispatch(todoNodesActions.createTodoAtPosition({ position, title, priority: 'medium' }))
    debouncedSave()
  }

  const handleCanvasContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation()
    const canvasPosition = convertScreenToCanvas(e.clientX, e.clientY)
    const menuItems = createCanvasContextMenu(canvasPosition)
    dispatch(showMenu({ x: e.clientX, y: e.clientY, items: menuItems, context: { position: canvasPosition } }))
  }

  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const canvasPosition = convertScreenToCanvas(e.clientX, e.clientY)
    handleCreateNode(canvasPosition, 'Новая задача')
  }

  const handleCanvasDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation()
    if (!currentCanvas) return
    
    const canvasPosition = convertScreenToCanvas(e.clientX, e.clientY)
    const files = Array.from(e.dataTransfer.files)
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    if (imageFiles.length === 0) return
    
    await uploadImages(imageFiles, canvasPosition)
    handleDrop(e, canvasPosition)
    debouncedSave()
  }, [convertScreenToCanvas, handleDrop, currentCanvas, uploadImages, debouncedSave])

  // ============================================
  // Clipboard (Ctrl+C, Ctrl+V, Ctrl+Delete)
  // ============================================
  // const canCopy = selectedNodes.length > 0 || selectedImageNodes.length > 0

// Замени useEffect с clipboard на этот (исправленный):

// Замени useEffect с clipboard на этот:

useEffect(() => {
  const handleKeyDown = async (e: KeyboardEvent) => {
    // Ctrl+C (code = 'KeyC')
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC' && !e.shiftKey) {
      if (selectedNodes.length === 0 && selectedImageNodes.length === 0) return
      
      e.preventDefault()
      e.stopPropagation()
      
      const todosData = selectedNodes.map(n => ({
        title: n.title,
        description: n.description || '',
        status: n.status,
        priority: n.priority,
        tags: [...n.tags],
        dueDate: n.dueDate,
        position: { x: n.position.x, y: n.position.y },
        size: { width: n.size?.width || 280, height: n.size?.height || 150 },
      }))
      
      const imagesData = selectedImageNodes.map(n => ({
        filePath: n.filePath,
        originalName: n.originalName,
        fileSize: n.fileSize,
        mimeType: n.mimeType,
        position: { x: n.position.x, y: n.position.y },
        size: { width: n.size?.width || 300, height: n.size?.height || 200 },
        alt: n.alt || '',
        caption: n.caption || '',
      }))
      
      const json = JSON.stringify({
        type: 'lil-papper', v: 1,
        todos: todosData,
        images: imagesData,
      })
      
      localStorage.setItem('lil-papper-clipboard', json)
      
      try {
        await navigator.clipboard.writeText(json)
      } catch {}
      
      console.log('✅ Скопировано:', todosData.length, 'задач,', imagesData.length, 'изображений')
      return
    }
    
    // Ctrl+V (code = 'KeyV')
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV' && !e.shiftKey) {
      e.preventDefault()
      e.stopPropagation()
      
      // 1. Сначала проверяем СИСТЕМНЫЙ БУФЕР на изображения
      let imagePasted = false
      
      try {
        const items = await navigator.clipboard.read()
        
        for (const item of items) {
          const imageType = item.types.find(t => t.startsWith('image/'))
          
          if (imageType) {
            console.log('🖼️ Вставка изображения из системного буфера:', imageType)
            const blob = await item.getType(imageType)
            
            const fileName = `pasted_${Date.now()}.png`
            const file = new File([blob], fileName, { type: imageType })
            const projectId = currentPage?.id?.split('_')[0] || 'default'
            
            const savedInfo = await FileService.saveImage(file, projectId)
            
            const pos = canvasRef.current 
              ? (() => {
                  const r = canvasRef.current!.getBoundingClientRect()
                  return convertScreenToCanvas(r.left + r.width/2, r.top + r.height/2)
                })()
              : { x: 200, y: 200 }
            
            const now = new Date().toISOString()
            
            dispatch(addImageNode({
              id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              type: 'image',
              position: { x: pos.x, y: pos.y },
              size: { width: savedInfo.width, height: savedInfo.height },
              zIndex: 1,
              filePath: savedInfo.filePath,
              originalName: savedInfo.originalName,
              fileSize: savedInfo.fileSize,
              mimeType: savedInfo.mimeType,
              createdAt: now,
              updatedAt: now,
              pageId: currentPage?.id || 'default',
              alt: '',
              caption: '',
            }))
            
            console.log('✅ Изображение сохранено и вставлено:', savedInfo.filePath)
            imagePasted = true
            break // Вставили одно изображение - выходим
          }
        }
      } catch (err) {
        console.log('⚠️ Системный буфер недоступен, пробуем localStorage')
      }
      
      // Если изображение уже вставлено - выходим
      if (imagePasted) return
      
      // 2. Если изображений нет - пробуем localStorage (задачи)
      const json = localStorage.getItem('lil-papper-clipboard')
      
      if (json) {
        try {
          const data = JSON.parse(json)
          if (data.type === 'lil-papper' && (data.todos?.length || data.images?.length)) {
            const pos = canvasRef.current 
              ? (() => {
                  const r = canvasRef.current!.getBoundingClientRect()
                  return convertScreenToCanvas(r.left + r.width/2, r.top + r.height/2)
                })()
              : { x: 200, y: 200 }
            
            let minX = Infinity, minY = Infinity
            const allItems = [...(data.todos || []), ...(data.images || [])]
            allItems.forEach((item: any) => {
              if (item.position.x < minX) minX = item.position.x
              if (item.position.y < minY) minY = item.position.y
            })
            
            let count = 0
            
            for (const todo of (data.todos || [])) {
              const ox = todo.position.x - minX
              const oy = todo.position.y - minY
              dispatch(todoNodesActions.createTodo({
                title: todo.title, description: todo.description,
                status: todo.status, priority: todo.priority,
                tags: todo.tags,
                dueDate: todo.dueDate ? new Date(todo.dueDate) : undefined,
                position: { x: pos.x + ox + 30, y: pos.y + oy + 30 },
                pageId: currentPage?.id,
              }))
              count++
            }
            
            const now = new Date().toISOString()
            for (const img of (data.images || [])) {
              const ox = img.position.x - minX
              const oy = img.position.y - minY
              dispatch(addImageNode({
                id: `paste_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'image',
                position: { x: pos.x + ox + 30, y: pos.y + oy + 30 },
                size: { ...img.size }, zIndex: 1,
                filePath: img.filePath, originalName: img.originalName,
                fileSize: img.fileSize, mimeType: img.mimeType,
                createdAt: now, updatedAt: now,
                pageId: currentPage?.id || 'default',
                alt: img.alt || '', caption: img.caption || '',
              }))
              count++
            }
            
            console.log('✅ Вставлено из localStorage:', count, 'элементов')
            localStorage.removeItem('lil-papper-clipboard')
            return
          }
        } catch (err) {
          console.warn('⚠️ Ошибка парсинга localStorage:', err)
        }
      }
      
      console.log('⚠️ Нечего вставлять')
      return
    }
    
    // Ctrl+Delete
    if ((e.ctrlKey || e.metaKey) && e.code === 'Delete') {
      e.preventDefault()
      if (selectedNodes.length > 0) dispatch(todoNodesActions.deleteSelectedTodos())
      if (selectedImageNodes.length > 0) dispatch(deleteImageNodes(selectedImageNodes.map(n => n.id)))
      handleClearAllSelection()
      return
    }
    
    handleViewportKeyDown(e)
  }

  window.addEventListener('keydown', handleKeyDown, true)

  return () => {
    window.removeEventListener('keydown', handleKeyDown, true)
  }
}, [selectedNodes, selectedImageNodes, dispatch, currentPage, convertScreenToCanvas, handleViewportKeyDown])

useEffect(() => {
  const testHandler = (e: KeyboardEvent) => {
    // Выводим ВСЕ нажатия клавиш
    console.log('🔑 Key:', e.key, 'ctrl:', e.ctrlKey, 'meta:', e.metaKey, 'shift:', e.shiftKey, 'alt:', e.altKey)
  }
  
  window.addEventListener('keydown', testHandler)
  
  return () => window.removeEventListener('keydown', testHandler)
}, [])








  // Обработчики панорамирования
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => handlePanMove(e)
    const handleGlobalMouseUp = () => { handlePanEnd(); document.body.style.cursor = '' }
    
    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)
    
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [handlePanMove, handlePanEnd])

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
    return todoNodes.filter((node: any) => currentCanvas.nodes.includes(node.id))
  }, [todoNodes, currentCanvas])

  const isTodoSelected = useCallback((id: string) => {
    return selectedTodoIds.includes(id) || selectedNodes.some(n => n.id === id)
  }, [selectedTodoIds, selectedNodes])

  const isImageSelected = useCallback((id: string) => {
    return selectedImageIds.includes(id) || selectedImageNodes.some(n => n.id === id)
  }, [selectedImageIds, selectedImageNodes])

  const handleClearAllSelection = useCallback(() => {
    dispatch(todoNodesActions.clearSelection())
    dispatch(clearImageSelection())
    clearSelection()
  }, [dispatch, clearSelection])

  return (
    <div className={styles.workspace}>
      {isSaving && (
        <div className={styles.savingIndicator}>
          <span className={styles.spinner} /> Saving preview...
        </div>
      )}

      {hasSelection && (
        <div className={styles.selectionInfo}>
          Выделено: {selectedCount || selectedNodes.length + selectedImageNodes.length}
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
          if (e.button === 0 && !e.altKey && !isDragging) handleClearAllSelection()
        }}
        onDoubleClick={handleCanvasDoubleClick}
        onContextMenu={handleCanvasContextMenu}
      >
        {viewport.showGrid && (
          <div className={styles.grid} style={{
            backgroundImage: `linear-gradient(90deg, #e0e0e0 1px, transparent 1px), linear-gradient(#e0e0e0 1px, transparent 1px)`,
            backgroundSize: `${viewport.gridSize * viewport.scale}px ${viewport.gridSize * viewport.scale}px`,
            backgroundPosition: `${viewport.position.x}px ${viewport.position.y}px`,
          }} />
        )}
        
        <div className={styles.content} style={{
          transform: `translate(${viewport.position.x}px, ${viewport.position.y}px) scale(${viewport.scale})`,
        }}>
          {currentCanvasNodes.map((node: any) => (
            <TodoNode key={node.id} node={node}
              onContextMenu={(e) => {
                e.preventDefault(); e.stopPropagation()
                dispatch(showMenu({ x: e.clientX, y: e.clientY, items: createNodeContextMenu(), context: { nodeId: node.id } }))
              }}
              onClick={(e, nodeId) => {
                e.stopPropagation()
                const isMultiSelect = (e.ctrlKey || e.metaKey) && e.altKey
                if (isMultiSelect) {
                  if (isTodoSelected(nodeId)) dispatch(todoNodesActions.deselectNode(nodeId))
                  else dispatch(todoNodesActions.selectNode(nodeId))
                } else {
                  handleClearAllSelection()
                  dispatch(todoNodesActions.selectNode(nodeId))
                }
              }}
              onDoubleClick={(e, nodeId) => { e.stopPropagation(); dispatch(todoNodesActions.startEditingTodo(nodeId)) }}
              isSelected={isTodoSelected(node.id)}
            />
          ))}

          {uploadingImages.map((tempNode) => (
            <ImageNode key={tempNode.tempId}
              node={{
                id: tempNode.tempId, type: 'image', position: tempNode.position,
                size: tempNode.size, zIndex: 1000, filePath: '',
                originalName: tempNode.originalName, fileSize: tempNode.fileSize,
                mimeType: tempNode.mimeType, createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(), pageId: currentPage?.id || 'default',
              }}
              isUploading={true} uploadProgress={tempNode.progress} viewport={viewport} isSelected={false}
            />
          ))}

          {imageNodes.map((node: any) => (
            <ImageNode key={node.id} node={node}
              isSelected={isImageSelected(node.id)} viewport={viewport} skipLoading={justUploadedIds.has(node.id)}
              onClick={(e, nodeId) => {
                e.stopPropagation()
                const isMultiSelect = (e.ctrlKey || e.metaKey) && e.altKey
                if (isMultiSelect) {
                  if (isImageSelected(nodeId)) dispatch(deselectImageNode(nodeId))
                  else dispatch(selectImageNode(nodeId))
                } else {
                  handleClearAllSelection()
                  dispatch(selectImageNode(nodeId))
                }
              }}
              onDoubleClick={(e, nodeId) => { e.stopPropagation() }}
            />
          ))}
        </div>

        {isDragging && dragState?.draggedNodeId && (
          <div className={styles.dragPreview} style={{
            left: dragState.currentPosition.x - dragState.offset.x,
            top: dragState.currentPosition.y - dragState.offset.y,
            transform: 'none', position: 'fixed',
          }}>Перемещение...</div>
        )}

        <ImageDropOverlay isVisible={isDraggingImage} error={imageDropError} onClearError={clearImageError} />
      </div>
      
      <ContextMenu />
      <QuickTodoForm />
      <TodoFormModal />
      
      <div className={styles.hotkeyHint}>
        Ctrl+C/V — копировать/вставить • Ctrl+Delete — удалить • Alt+ЛКМ — панорамирование • Ctrl+Alt+ЛКМ — выделение
      </div>
    </div>
  )
}