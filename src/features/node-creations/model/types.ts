// src/features/context-menu/model/types.ts
export interface MenuItemData {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  // ❌ УДАЛИТЬ: onClick: () => void;
  // ✅ ДОБАВИТЬ вместо функции:
  actionType?: string; // Например: 'EDIT_NODE', 'DELETE_NODE'
  payload?: any; // Данные для action
  children?: MenuItemData[];
}

export interface ContextMenuState {
  isVisible: boolean;
  position: { x: number; y: number } | null;
  items: MenuItemData[];
  context?: any;
}