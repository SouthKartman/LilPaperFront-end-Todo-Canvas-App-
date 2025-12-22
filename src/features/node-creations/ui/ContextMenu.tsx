import React, { useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@shared/lib/state/store';
import { MenuItem } from './MenuItem';
import { MenuDivider } from './MenuDivider';
import './ContextMenu.css';

export const ContextMenu: React.FC = () => {
  const menuRef = useRef<HTMLDivElement>(null);
  const { isVisible, position, items } = useSelector((state: RootState) => state.contextMenu);

  // Позиционирование меню (чтобы не выходило за границы экрана)
  useEffect(() => {
    if (menuRef.current && position) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let x = position.x;
      let y = position.y;

      // Корректировка по горизонтали
      if (x + rect.width > viewportWidth) {
        x = viewportWidth - rect.width - 10;
      }

      // Корректировка по вертикали
      if (y + rect.height > viewportHeight) {
        y = viewportHeight - rect.height - 10;
      }

      menu.style.left = `${x}px`;
      menu.style.top = `${y}px`;
    }
  }, [position, isVisible]);

  if (!isVisible || !position) return null;

  const handleMenuItemClick = (onClick: () => void) => {
    onClick();
  };

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 1000,
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
              onClick={() => handleMenuItemClick(item.onClick)}
              hasChildren={!!item.children}
            />
          );
        })}
      </div>
    </div>
  );
};