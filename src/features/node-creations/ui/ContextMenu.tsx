import React, { useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@shared/lib/state/store';
import { hideMenu } from '../model/slice';
import { MenuItem } from './MenuItem';
import { MenuDivider } from './MenuDivider';
import './ContextMenu.css';

// Импортируем thunk для удаления из БД
import { 
  deleteTodoFromDB, 
  deleteMultipleTodosFromDB,
  duplicateTodo,
  setTodoStatus,
  setTodoPriority,
  startEditingTodo,
  createTodoAtPosition
} from '@features/todo-nodes/model/slice';

export const ContextMenu: React.FC = () => {
  const dispatch = useDispatch();
  const menuRef = useRef<HTMLDivElement>(null);
  const { isVisible, position, items, context } = useSelector((state: RootState) => state.contextMenu);
  const selectedNodeIds = useSelector((state: RootState) => state.todoNodes.selectedNodeIds);

  // Обработчик клика по пункту меню
  const handleMenuItemClick = async (item: any) => {
    if (item.disabled) return;
    
    try {
      switch (item.actionType) {
        case 'EDIT_NODE':
          if (context?.nodeId) {
            dispatch(startEditingTodo(context.nodeId));
          }
          break;
          
        case 'DUPLICATE_NODE':
          if (context?.nodeId) {
            dispatch(duplicateTodo(context.nodeId));
          }
          break;
          
        case 'DELETE_NODE':
          if (context?.nodeId) {
            // Удаляем из IndexedDB без подтверждения
            await dispatch(deleteTodoFromDB(context.nodeId)).unwrap();
          }
          break;
          
        case 'DELETE_SELECTED_NODES':
          if (context?.nodeIds && context.nodeIds.length > 0) {
            // Массовое удаление из IndexedDB без подтверждения
            await dispatch(deleteMultipleTodosFromDB(context.nodeIds)).unwrap();
          }
          break;
          
        case 'SET_STATUS':
          if (context?.nodeId && item.payload?.status) {
            dispatch(setTodoStatus({
              id: context.nodeId,
              status: item.payload.status
            }));
          }
          break;
          
        case 'SET_PRIORITY':
          if (context?.nodeId && item.payload?.priority) {
            dispatch(setTodoPriority({
              id: context.nodeId,
              priority: item.payload.priority
            }));
          }
          break;
          
        case 'CREATE_TODO':
          if (item.payload?.position) {
            dispatch(createTodoAtPosition({
              position: item.payload.position
            }));
          }
          break;
          
        default:
          console.warn('Unknown action type:', item.actionType);
      }
    } catch (error) {
      console.error('Ошибка при выполнении действия:', error);
    }
    
    dispatch(hideMenu());
  };

  // Позиционирование
  useEffect(() => {
    if (menuRef.current && position) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let x = position.x;
      let y = position.y;

      if (x + rect.width > viewportWidth) {
        x = viewportWidth - rect.width - 10;
      }

      if (y + rect.height > viewportHeight) {
        y = viewportHeight - rect.height - 10;
      }

      menu.style.left = `${x}px`;
      menu.style.top = `${y}px`;
    }
  }, [position, isVisible]);

  // Закрытие при клике вне меню
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        dispatch(hideMenu());
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dispatch(hideMenu());
      }
    };

    if (isVisible) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      
      return () => {
        document.removeEventListener('click', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isVisible, dispatch]);

  if (!isVisible || !position) return null;

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 1000,
        minWidth: '200px',
        background: '#ffffff',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        padding: '4px 0',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="context-menu__content">
        {items.map((item, index) => {
          if (item.id === 'divider') {
            return <MenuDivider key={`divider-${index}`} />;
          }

          return (
            <MenuItem
              key={item.id}
              label={item.label}
              icon={item.icon}
              shortcut={item.shortcut}
              disabled={item.disabled}
              onClick={() => handleMenuItemClick(item)}
              hasChildren={!!item.children}
            />
          );
        })}
      </div>
    </div>
  );
};