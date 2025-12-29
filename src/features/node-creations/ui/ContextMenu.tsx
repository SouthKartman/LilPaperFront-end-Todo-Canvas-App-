// src/features/context-menu/ui/ContextMenu/ContextMenu.tsx
import React, { useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@shared/lib/state/store';
import { hideMenu } from '../model/slice';
import { MenuItem } from './MenuItem';
import { MenuDivider } from './MenuDivider';
import './ContextMenu.css';

// Импортируем actions для обработки
import { todoNodesActions } from '@features/todo-nodes/model/slice';

export const ContextMenu: React.FC = () => {
  const dispatch = useDispatch();
  const menuRef = useRef<HTMLDivElement>(null);
  const { isVisible, position, items, context } = useSelector((state: RootState) => state.contextMenu);

  // Обработчик клика по пункту меню
  const handleMenuItemClick = (item: any) => {
    if (item.disabled) return;
    
    // Обрабатываем действие на основе actionType
    switch (item.actionType) {
      case 'EDIT_NODE':
        if (context?.nodeId) {
          dispatch(todoNodesActions.startEditingTodo(context.nodeId));
        }
        break;
        
      case 'DUPLICATE_NODE':
        if (context?.nodeId) {
          dispatch(todoNodesActions.duplicateTodo(context.nodeId));
        }
        break;
        
      case 'DELETE_NODE':
        if (context?.nodeId) {
          dispatch(todoNodesActions.deleteTodo(context.nodeId));
        }
        break;
        
      case 'SET_STATUS':
        if (context?.nodeId && item.payload?.status) {
          dispatch(todoNodesActions.setTodoStatus({
            id: context.nodeId,
            status: item.payload.status
          }));
        }
        break;
        
      case 'SET_PRIORITY':
        if (context?.nodeId && item.payload?.priority) {
          dispatch(todoNodesActions.setTodoPriority({
            id: context.nodeId,
            priority: item.payload.priority
          }));
        }
        break;
        
      case 'CREATE_TODO':
        if (item.payload?.position) {
          dispatch(todoNodesActions.createTodoAtPosition({
            position: item.payload.position
          }));
        }
        break;
        
      default:
        console.warn('Unknown action type:', item.actionType);
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

    if (isVisible) {
      document.addEventListener('click', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
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
        zIndex: 10,
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