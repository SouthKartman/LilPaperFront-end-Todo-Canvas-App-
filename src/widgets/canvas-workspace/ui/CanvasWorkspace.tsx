// src/widgets/canvas-workspace/ui/CanvasWorkspace.tsx
import React, { useEffect, useCallback, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTodoNodes } from '@features/todo-nodes/lib/useTodoNode'
import { TodoNode } from '@features/todo-nodes/ui/TodoNode/TodoNode'
import { useCanvasDnd } from '@features/canvas-dnd/lib/useCanvasDnd'
import { useContextMenu } from '@features/node-creations/lib/useContextMenu'
import { ContextMenu } from '@features/node-creations/ui/ContextMenu'
import { todoNodesActions } from '@features/todo-nodes/model/slice'
import { selectViewportTransform } from '@features/canvas-viewport/model/selectors'
import { selectAllTodoNodes, selectSelectedTodoNodes } from '@features/todo-nodes/model/selectors'
import { useTodoForm } from '@features/todo-form/lib/useTodoForm'
import { QuickTodoForm } from '@features/todo-form/ui/QuickTodoForm'
import { TodoFormModal } from '@features/todo-form/ui/TodoFormModal'
import styles from './CanvasWorkspace.module.css'
import { RootState } from '@shared/lib/state/store'

export const CanvasWorkspace: React.FC = () => {
  const { nodes } = useTodoNodes()
  const { dragState, isDragging } = useCanvasDnd()
  const dispatch = useDispatch()
  const canvasRef = useRef<HTMLDivElement>(null)
  
  const todoNodes = useSelector(selectAllTodoNodes)
  const selectedNodes = useSelector(selectSelectedTodoNodes)
  const viewportTransform = useSelector(selectViewportTransform)
  const { handleContextMenu, closeMenu, updateItems } = useContextMenu()
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

  // Функция для получения контекстного меню для канваса
  const getCanvasMenuItems = useCallback((screenPosition: { x: number; y: number }) => {
    const canvasPosition = convertScreenToCanvas(screenPosition.x, screenPosition.y)
    
    const menuItems = [
      {
        id: 'add-todo',
        label: 'Добавить задачу',
        icon: '📝',
        onClick: () => {
          dispatch(todoNodesActions.createTodoAtPosition({
            position: canvasPosition,
            type: 'default',
            title: 'Новая задача',
            priority: 'medium',
          }))
          closeMenu()
        },
      },
      {
        id: 'add-checklist',
        label: 'Добавить чек-лист',
        icon: '✅',
        onClick: () => {
          dispatch(todoNodesActions.createTodoAtPosition({
            position: canvasPosition,
            type: 'checklist',
            title: 'Новый чек-лист',
            priority: 'medium',
          }))
          closeMenu()
        },
      },
      {
        id: 'add-urgent',
        label: 'Добавить срочную задачу',
        icon: '🚨',
        onClick: () => {
          dispatch(todoNodesActions.createTodoAtPosition({
            position: canvasPosition,
            type: 'urgent',
            title: 'Срочная задача!',
            priority: 'high',
          }))
          closeMenu()
        },
      },
      {
        id: 'add-with-form',
        label: 'Создать с формой',
        icon: '📋',
        onClick: () => {
          openQuickForm({ x: screenPosition.x, y: screenPosition.y })
          closeMenu()
        },
      },
      {
        id: 'divider-1',
        label: 'divider',
        onClick: () => {},
      },
      {
        id: 'paste',
        label: 'Вставить',
        icon: '📋',
        shortcut: 'Ctrl+V',
        disabled: true,
        onClick: () => {
          console.log('Вставить из буфера')
          closeMenu()
        },
      },
      {
        id: 'divider-2',
        label: 'divider',
        onClick: () => {},
      },
      {
        id: 'select-all',
        label: 'Выделить всё',
        icon: '☑️',
        shortcut: 'Ctrl+A',
        onClick: () => {
          const allNodeIds = todoNodes.map(node => node.id)
          allNodeIds.forEach(nodeId => {
            dispatch(todoNodesActions.selectNode(nodeId))
          })
          closeMenu()
        },
      },
      {
        id: 'clear-selection',
        label: 'Снять выделение',
        icon: '✖️',
        disabled: selectedNodes.length === 0,
        onClick: () => {
          dispatch(todoNodesActions.clearSelection())
          closeMenu()
        },
      },
      {
        id: 'divider-3',
        label: 'divider',
        onClick: () => {},
      },
      {
        id: 'delete-selected',
        label: 'Удалить выделенные',
        icon: '🗑️',
        shortcut: 'Del',
        disabled: selectedNodes.length === 0,
        onClick: () => {
          if (window.confirm(`Удалить ${selectedNodes.length} задач?`)) {
            selectedNodes.forEach(node => {
              dispatch(todoNodesActions.deleteTodo(node.id))
            })
          }
          closeMenu()
        },
      },
    ]

    return menuItems
  }, [dispatch, convertScreenToCanvas, closeMenu, todoNodes, selectedNodes, openQuickForm])

  // Функция для получения контекстного меню для ноды
  const getNodeMenuItems = useCallback((nodeId: string) => {
    return [
      {
        id: 'edit',
        label: 'Редактировать',
        icon: '✏️',
        onClick: () => {
          dispatch(todoNodesActions.startEditingTodo(nodeId))
          closeMenu()
        },
      },
      {
        id: 'duplicate',
        label: 'Дублировать',
        icon: '📄',
        shortcut: 'Ctrl+D',
        onClick: () => {
          dispatch(todoNodesActions.duplicateTodo(nodeId))
          closeMenu()
        },
      },
      {
        id: 'delete',
        label: 'Удалить',
        icon: '🗑️',
        shortcut: 'Del',
        onClick: () => {
          if (window.confirm('Удалить задачу?')) {
            dispatch(todoNodesActions.deleteTodo(nodeId))
          }
          closeMenu()
        },
      },
      {
        id: 'divider-1',
        label: 'divider',
        onClick: () => {},
      },
      {
        id: 'set-critical',
        label: 'Критический приоритет',
        icon: '⭕',
        onClick: () => {
          dispatch(todoNodesActions.setTodoPriority({ id: nodeId, priority: 'critical' }))
          closeMenu()
        },
      },
      {
        id: 'set-high',
        label: 'Высокий приоритет',
        icon: '🔴',
        onClick: () => {
          dispatch(todoNodesActions.setTodoPriority({ id: nodeId, priority: 'high' }))
          closeMenu()
        },
      },
      {
        id: 'set-medium',
        label: 'Средний приоритет',
        icon: '🟡',
        onClick: () => {
          dispatch(todoNodesActions.setTodoPriority({ id: nodeId, priority: 'medium' }))
          closeMenu()
        },
      },
      {
        id: 'set-low',
        label: 'Низкий приоритет',
        icon: '🟢',
        onClick: () => {
          dispatch(todoNodesActions.setTodoPriority({ id: nodeId, priority: 'low' }))
          closeMenu()
        },
      },
      {
        id: 'divider-2',
        label: 'divider',
        onClick: () => {},
      },
      {
        id: 'bring-to-front',
        label: 'На передний план',
        icon: '⬆️',
        onClick: () => {
          dispatch(todoNodesActions.bringToFront(nodeId))
          closeMenu()
        },
      },
      {
        id: 'send-to-back',
        label: 'На задний план',
        icon: '⬇️',
        onClick: () => {
          dispatch(todoNodesActions.sendToBack(nodeId))
          closeMenu()
        },
      },
      {
        id: 'divider-3',
        label: 'divider',
        onClick: () => {},
      },
      {
        id: 'mark-todo',
        label: 'Статус: К выполнению',
        icon: '📝',
        onClick: () => {
          dispatch(todoNodesActions.setTodoStatus({ id: nodeId, status: 'todo' }))
          closeMenu()
        },
      },
      {
        id: 'mark-in-progress',
        label: 'Статус: В процессе',
        icon: '⚙️',
        onClick: () => {
          dispatch(todoNodesActions.setTodoStatus({ id: nodeId, status: 'in-progress' }))
          closeMenu()
        },
      },
      {
        id: 'mark-done',
        label: 'Статус: Выполнено',
        icon: '✅',
        onClick: () => {
          dispatch(todoNodesActions.setTodoStatus({ id: nodeId, status: 'done' }))
          closeMenu()
        },
      },
      {
        id: 'mark-blocked',
        label: 'Статус: Заблокировано',
        icon: '⛔',
        onClick: () => {
          dispatch(todoNodesActions.setTodoStatus({ id: nodeId, status: 'blocked' }))
          closeMenu()
        },
      },
    ]
  }, [dispatch, closeMenu])

  // Обработчик контекстного меню для канваса
  const handleCanvasContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    const menuItems = getCanvasMenuItems({ x: e.clientX, y: e.clientY })
    updateItems(menuItems)
    handleContextMenu(e)
  }, [getCanvasMenuItems, updateItems, handleContextMenu])

  // Обработчик контекстного меню для ноды
  const handleNodeContextMenu = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    const menuItems = getNodeMenuItems(nodeId)
    updateItems(menuItems)
    handleContextMenu(e)
  }, [getNodeMenuItems, updateItems, handleContextMenu])

  // Обработчик клика по ноде для выделения
  const handleNodeClick = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    
    if (e.ctrlKey || e.metaKey) {
      const node = todoNodes.find(n => n.id === nodeId)
      if (node) {
        const isSelected = selectedNodes.some(n => n.id === nodeId)
        if (isSelected) {
          dispatch(todoNodesActions.deselectNode(nodeId))
        } else {
          dispatch(todoNodesActions.selectNode(nodeId))
        }
      }
    } else if (e.shiftKey) {
      dispatch(todoNodesActions.selectNode(nodeId))
    } else {
      dispatch(todoNodesActions.clearSelection())
      dispatch(todoNodesActions.selectNode(nodeId))
    }
    
    closeMenu()
  }, [dispatch, closeMenu, todoNodes, selectedNodes])

  // Обработчик клика по канвасу для закрытия меню и снятия выделения
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
        dispatch(todoNodesActions.clearSelection())
      }
      closeMenu()
    }
  }, [dispatch, closeMenu])

  // Обработчик двойного клика по канвасу для быстрого создания
  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const canvasRect = canvasRef.current?.getBoundingClientRect()
    if (!canvasRect) return
    
    const relativeX = e.clientX - canvasRect.left
    const relativeY = e.clientY - canvasRect.top
    
    // Конвертируем в координаты канваса
    const canvasPosition = convertScreenToCanvas(e.clientX, e.clientY)
    
    // Создаем задачу в указанной позиции
    dispatch(todoNodesActions.createTodoAtPosition({
      position: canvasPosition,
      type: 'default',
      title: 'Новая задача',
      priority: 'medium',
    }))
    
    // Альтернативно можно открыть быструю форму:
    // openQuickForm({ x: e.clientX, y: e.clientY })
  }, [dispatch, convertScreenToCanvas])

  // Обработчик двойного клика по ноде для редактирования
  const handleNodeDoubleClick = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    dispatch(todoNodesActions.startEditingTodo(nodeId))
  }, [dispatch])

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
      onClick={handleCanvasClick}
    >
      <div 
        ref={canvasRef}
        className={styles.canvas}
        onContextMenu={handleCanvasContextMenu}
        onDoubleClick={handleCanvasDoubleClick}
      >
        <div className={styles.grid} />
        
        {/* Отображаем все ноды */}
        {nodes.map((node: any) => (
          <TodoNode 
            key={node.id} 
            node={node}
            onContextMenu={(e) => handleNodeContextMenu(e, node.id)}
            onClick={(e) => handleNodeClick(e, node.id)}
            onDoubleClick={(e) => handleNodeDoubleClick(e, node.id)}
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
      
      {/* Глобальное контекстное меню */}
      <ContextMenu />
      
      {/* Быстрая форма создания задачи */}
      <QuickTodoForm />
      
      {/* Модальное окно с полной формой */}
      <TodoFormModal />

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
      
      {/* Информация о выделении */}
      {selectedNodes.length > 0 && (
        <div className={styles.selectionInfo}>
          {/* Выбрано: {selectedNodes.length} задач
          <span className={styles.selectionHint}>
            (Del - удалить, Ctrl+D - дублировать, Esc - снять выделение)
          </span> */}
        </div>
      )}
      
      {/* Подсказки по горячим клавишам */}
      <div className={styles.hotkeyHint}>
        Двойной клик - создать задачу • Ctrl+N - новая задача • Ctrl+Shift+N - форма
      </div>
    </div>
  )
}