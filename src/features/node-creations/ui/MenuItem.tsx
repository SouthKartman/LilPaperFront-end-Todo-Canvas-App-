import React from 'react';
import './MenuItem.css';

interface MenuItemProps {
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  onClick: () => void;
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
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      onClick();
    }
  };

  return (
    <button
      className={`menu-item ${disabled ? 'menu-item--disabled' : ''}`}
      onClick={handleClick}
      disabled={disabled}
    >
      <div className="menu-item__content">
        {icon && <span className="menu-item__icon">{icon}</span>}
        <span className="menu-item__label">{label}</span>
        {shortcut && <span className="menu-item__shortcut">{shortcut}</span>}
        {hasChildren && <span className="menu-item__arrow">▶</span>}
      </div>
    </button>
  );
};