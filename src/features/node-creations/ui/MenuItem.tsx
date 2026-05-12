import React from 'react';
import './MenuItem.css';

interface MenuItemProps {
  label: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  onClick?: () => void;
  hasChildren?: boolean;
}

export const MenuItem: React.FC<MenuItemProps> = ({
  label,
  icon,
  shortcut,
  disabled = false,
  onClick,
  hasChildren = false,
}) => {
  return (
    <div
      className={`menu-item ${disabled ? 'menu-item--disabled' : ''}`}
      onClick={() => !disabled && onClick?.()}
    >
      <div className="menu-item__content">
        {icon && <span className="menu-item__icon">{icon}</span>}
        <span className="menu-item__label">{label}</span>
      </div>
      <div className="menu-item__right">
        {shortcut && <span className="menu-item__shortcut">{shortcut}</span>}
        {hasChildren && <span className="menu-item__arrow">▶</span>}
      </div>
    </div>
  );
};