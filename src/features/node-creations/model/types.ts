export type MenuItemType = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  onClick: () => void;
  children?: MenuItemType[];
};

export type ContextMenuState = {
  isVisible: boolean;
  position: { x: number; y: number } | null;
  items: MenuItemType[];
  context?: {
    type: 'canvas' | 'node' | 'selection';
    targetId?: string;
    position?: { x: number; y: number };
  };
};

export type ShowMenuPayload = {
  x: number;
  y: number;
  context?: ContextMenuState['context'];
};