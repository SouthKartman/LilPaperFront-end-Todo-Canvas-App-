// Типы для универсальной плагин-ноды

export type PluginType = 'iframe' | 'video' | 'audio' | 'pdf' | 'chart' | 'custom';

export interface PluginNodeData {
  id: string;
  type: PluginType;
  pluginId: string;
  
  // Универсальные свойства
  title?: string;
  width: number;
  height: number;
  position: { x: number; y: number };
  pageId?: string; // 👈 ДОБАВЬТЕ ЭТО ПОЛЕ
  createdAt: number;
  updatedAt: number;
  
  // Свойства для конкретных плагинов (динамические)
  pluginProps: Record<string, any>;
  
  // Состояние
  isEditing?: boolean;
  isLoading?: boolean;
  error?: string | null;
  zIndex?: number;
}

export interface PluginDefinition {
  id: string;
  type: PluginType;
  name: string;
  icon?: string;
  defaultSize: { width: number; height: number };
  minSize: { width: number; height: number };
  maxSize: { width: number; height: number };
  
  // Компонент для рендеринга
  component: React.ComponentType<PluginComponentProps>;
  
  // Компонент для настроек (опционально)
  settingsComponent?: React.ComponentType<PluginSettingsProps>;
  
  // Валидация props при создании
  validateProps?: (props: Record<string, any>) => boolean;
  
  // Дефолтные пропсы
  getDefaultProps?: () => Record<string, any>;
  
  // Обработчик сохранения
  onSave?: (data: PluginNodeData) => Promise<void>;
  
  // Обработчик удаления
  onDelete?: (id: string) => Promise<void>;
}

export interface PluginComponentProps {
  node: PluginNodeData;
  isSelected?: boolean;
  isDragging?: boolean;
  onUpdate: (updates: Partial<PluginNodeData>) => void;
  onDelete?: () => void;
  onResize?: (width: number, height: number) => void;
  onDragStart?: (e: React.MouseEvent) => void;
}

export interface PluginSettingsProps {
  props: Record<string, any>;
  onChange: (newProps: Record<string, any>) => void;
  onClose: () => void;
}