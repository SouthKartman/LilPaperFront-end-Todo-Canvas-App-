// src/features/node-creations/lib/useСontextMenu.ts
import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@shared/lib/state/store';
import { showMenu, hideMenu } from '../model/slice';

export const useContextMenu = () => {
  const dispatch = useDispatch<AppDispatch>();
  const menuState = useSelector((state: RootState) => state.contextMenu);
  const selectedNodeIds = useSelector((state: RootState) => state.todoNodes.selectedNodeIds);
  const nodes = useSelector((state: RootState) => state.todoNodes.nodes);

  const closeMenu = useCallback(() => {
    dispatch(hideMenu());
  }, [dispatch]);

  // Показать контекстное меню для ноды
  const showContextMenu = useCallback((
    e: React.MouseEvent,
    nodeId: string,
    customPosition?: { x: number; y: number }
  ) => {
    e.preventDefault();
    e.stopPropagation();
    
    const mouseX = customPosition?.x ?? e.clientX;
    const mouseY = customPosition?.y ?? e.clientY;
    const isMultipleSelected = selectedNodeIds.length > 1 && selectedNodeIds.includes(nodeId);
    const currentTodo = nodes[nodeId];
    
    const menuItems = [
      {
        id: 'edit',
        label: 'Редактировать',
        actionType: 'EDIT_NODE',
        shortcut: 'Enter',
        disabled: false,
      },
      {
        id: 'duplicate',
        label: 'Дублировать',
        actionType: 'DUPLICATE_NODE',
        shortcut: 'Ctrl+D',
        disabled: false,
      },
      {
        id: 'divider1',
        label: '',
        actionType: 'divider',
        disabled: true,
      },
    ];
    
    // Добавляем пункты статуса
    if (currentTodo) {
      menuItems.push({
        id: 'setStatus',
        label: 'Изменить статус',
        actionType: 'SET_STATUS',
        children: [
          { 
            id: 'status-todo',
            label: '📋 К выполнению', 
            actionType: 'SET_STATUS', 
            payload: { status: 'todo' },
            disabled: currentTodo.status === 'todo'
          },
          { 
            id: 'status-in-progress',
            label: '⚙️ В процессе', 
            actionType: 'SET_STATUS', 
            payload: { status: 'in-progress' },
            disabled: currentTodo.status === 'in-progress'
          },
          { 
            id: 'status-done',
            label: '✅ Выполнено', 
            actionType: 'SET_STATUS', 
            payload: { status: 'done' },
            disabled: currentTodo.status === 'done'
          },
          { 
            id: 'status-blocked',
            label: '🔴 Заблокировано', 
            actionType: 'SET_STATUS', 
            payload: { status: 'blocked' },
            disabled: currentTodo.status === 'blocked'
          },
        ],
      });
      
      // Добавляем пункты приоритета
      menuItems.push({
        id: 'setPriority',
        label: 'Изменить приоритет',
        actionType: 'SET_PRIORITY',
        children: [
          { 
            id: 'priority-critical',
            label: '🔥 Критический', 
            actionType: 'SET_PRIORITY', 
            payload: { priority: 'critical' },
            disabled: currentTodo.priority === 'critical'
          },
          { 
            id: 'priority-high',
            label: '⬆️ Высокий', 
            actionType: 'SET_PRIORITY', 
            payload: { priority: 'high' },
            disabled: currentTodo.priority === 'high'
          },
          { 
            id: 'priority-medium',
            label: '➡️ Средний', 
            actionType: 'SET_PRIORITY', 
            payload: { priority: 'medium' },
            disabled: currentTodo.priority === 'medium'
          },
          { 
            id: 'priority-low',
            label: '⬇️ Низкий', 
            actionType: 'SET_PRIORITY', 
            payload: { priority: 'low' },
            disabled: currentTodo.priority === 'low'
          },
        ],
      });
    }
    
    menuItems.push(
      {
        id: 'divider2',
        label: '',
        actionType: 'divider',
        disabled: true,
      },
      {
        id: 'delete',
        label: isMultipleSelected ? `🗑️ Удалить (${selectedNodeIds.length})` : '🗑️ Удалить',
        actionType: isMultipleSelected ? 'DELETE_SELECTED_NODES' : 'DELETE_NODE',
        shortcut: 'Del',
        disabled: false,
      }
    );
    
    dispatch(showMenu({
      x: mouseX,
      y: mouseY,
      items: menuItems,
      context: {
        nodeId,
        nodeIds: isMultipleSelected ? selectedNodeIds : [nodeId],
      },
    }));
  }, [dispatch, selectedNodeIds, nodes]);

  // Показать контекстное меню для пустого места на холсте
  const showCanvasMenu = useCallback((
    e: React.MouseEvent,
    position: { x: number; y: number }
  ) => {
    e.preventDefault();
    e.stopPropagation();
    
    const menuItems = [
      {
        id: 'create-todo',
        label: '➕ Создать задачу',
        actionType: 'CREATE_TODO',
        payload: { position },
        shortcut: 'Ctrl+N',
      },
    ];
    
    dispatch(showMenu({
      x: position.x,
      y: position.y,
      items: menuItems,
      context: { position },
    }));
  }, [dispatch]);

  // Закрытие меню по ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && menuState.isVisible) {
        closeMenu();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuState.isVisible, closeMenu]);

  return {
    isVisible: menuState.isVisible,
    position: menuState.position,
    items: menuState.items,
    context: menuState.context,
    showContextMenu,
    showCanvasMenu,
    closeMenu,
  };
};