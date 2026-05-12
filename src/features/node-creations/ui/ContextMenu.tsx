import React, { useRef, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@shared/lib/state/store';
import { hideMenu } from '../model/slice';
import { MenuItem } from './MenuItem';
import { MenuDivider } from './MenuDivider';
import './ContextMenu.css';
import { PluginRegistry } from '@entities/plugin-node/model/pluginRegistry';
import { nanoid } from 'nanoid';
import { addPluginNode } from '@features/plugin-nodes/model/slice';
import { createTodoAtPosition } from '@features/todo-nodes/model/slice';
import { 
  deleteTodoFromDB, 
  deleteMultipleTodosFromDB,
  setTodoStatus,
  setTodoPriority
} from '@features/todo-nodes/model/slice';

// Функция для получения пунктов меню плагинов с группировкой
export const getPluginMenuItems = (
  onCreate: (pluginId: string) => void,
  grouped: boolean = true
) => {
  const allPlugins = PluginRegistry.getAllPlugins();
  
  if (allPlugins.length === 0) return [];
  
  if (!grouped) {
    return allPlugins.map(plugin => ({
      id: `plugin-${plugin.id}`,
      label: `${plugin.icon || '🧩'} ${plugin.name}`,
      onClick: () => onCreate(plugin.id),
      actionType: 'CREATE_PLUGIN_NODE',
      pluginId: plugin.id,
    }));
  }
  
  // Группировка по типам плагинов
  const groupedPlugins: Record<string, typeof allPlugins> = {};
  
  allPlugins.forEach(plugin => {
    const groupName = getPluginGroupName(plugin.type);
    if (!groupedPlugins[groupName]) {
      groupedPlugins[groupName] = [];
    }
    groupedPlugins[groupName].push(plugin);
  });
  
  const menuItems: any[] = [];
  
  Object.entries(groupedPlugins).forEach(([groupName, plugins]) => {
    if (plugins.length === 1) {
      const plugin = plugins[0];
      menuItems.push({
        id: `plugin-${plugin.id}`,
        label: `${plugin.icon || '🧩'} ${plugin.name}`,
        onClick: () => onCreate(plugin.id),
        actionType: 'CREATE_PLUGIN_NODE',
        pluginId: plugin.id,
      });
    } else {
      menuItems.push({
        id: `plugin-group-${groupName}`,
        label: `📦 ${groupName}`,
        children: plugins.map(plugin => ({
          id: `plugin-${plugin.id}`,
          label: `${plugin.icon || '🧩'} ${plugin.name}`,
          onClick: () => onCreate(plugin.id),
          actionType: 'CREATE_PLUGIN_NODE',
          pluginId: plugin.id,
        })),
      });
    }
  });
  
  return menuItems;
};

const getPluginGroupName = (type: string): string => {
  const groupNames: Record<string, string> = {
    'iframe': 'Web Content',
    'video': 'Video',
    'audio': 'Audio',
    'pdf': 'Documents',
    'chart': 'Charts',
    'custom': 'Custom',
  };
  return groupNames[type] || 'Plugins';
};

export const ContextMenu: React.FC = () => {
  const dispatch = useDispatch();
  const menuRef = useRef<HTMLDivElement>(null);
  const [submenuPosition, setSubmenuPosition] = useState<{ x: number; y: number; parentId: string } | null>(null);
  
  const { isVisible, position, items, context } = useSelector((state: RootState) => state.contextMenu);

  const handleCreatePluginNode = (pluginId: string) => {
    const plugin = PluginRegistry.getPlugin(pluginId);
    if (!plugin) return;

    const createPosition = context?.position || { x: 100, y: 100 };
    
    const newNode = {
      id: nanoid(),
      type: plugin.type,
      pluginId: pluginId,
      title: plugin.name,
      width: plugin.defaultSize.width,
      height: plugin.defaultSize.height,
      position: createPosition,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pluginProps: plugin.getDefaultProps ? plugin.getDefaultProps() : {},
      isLoading: false,
      isEditing: false,
    };
    
    dispatch(addPluginNode(newNode));
  };

  const handleMenuItemClick = async (item: any) => {
    if (item.disabled) return;
    
    if (item.children) {
      return;
    }
    
    try {
      switch (item.actionType) {
        case 'DELETE_NODE':
          if (context?.nodeId) {
            await dispatch(deleteTodoFromDB(context.nodeId)).unwrap();
          }
          break;
          
        case 'DELETE_SELECTED_NODES':
          if (context?.nodeIds && context.nodeIds.length > 0) {
            await dispatch(deleteMultipleTodosFromDB(context.nodeIds)).unwrap();
          }
          break;
          
        case 'SET_STATUS':
          if (context?.nodeId && item.payload?.status) {
            dispatch(setTodoStatus({ id: context.nodeId, status: item.payload.status }));
          }
          break;
          
        case 'SET_PRIORITY':
          if (context?.nodeId && item.payload?.priority) {
            dispatch(setTodoPriority({ id: context.nodeId, priority: item.payload.priority }));
          }
          break;
          
        case 'CREATE_TODO':
          if (item.payload?.position) {
            dispatch(createTodoAtPosition({ position: item.payload.position }));
          }
          break;
          
        case 'CREATE_PLUGIN_NODE':
          if (item.pluginId) {
            handleCreatePluginNode(item.pluginId);
          } else if (item.payload?.pluginId) {
            handleCreatePluginNode(item.payload.pluginId);
          }
          break;
          
        default:
          console.warn('Unknown action type:', item.actionType);
      }
    } catch (error) {
      console.error('Ошибка при выполнении действия:', error);
    }
    
    dispatch(hideMenu());
    setSubmenuPosition(null);
  };

  const handleMenuItemHover = (item: any, event: React.MouseEvent) => {
    if (item.children && item.children.length > 0) {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      setSubmenuPosition({
        x: rect.right + 5,
        y: rect.top,
        parentId: item.id,
      });
    }
  };

  const handleSubmenuClose = () => {
    setSubmenuPosition(null);
  };

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        dispatch(hideMenu());
        setSubmenuPosition(null);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dispatch(hideMenu());
        setSubmenuPosition(null);
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
    <>
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
          {items.map((item: any, index: number) => {
            if (item.id === 'divider') {
              return <MenuDivider key={`divider-${index}`} />;
            }

            return (
              <div
                key={item.id}
                onMouseEnter={(e) => handleMenuItemHover(item, e)}
                onMouseLeave={handleSubmenuClose}
              >
                <MenuItem
                  label={item.label}
                  icon={item.icon}
                  shortcut={item.shortcut}
                  disabled={item.disabled}
                  onClick={() => handleMenuItemClick(item)}
                  hasChildren={!!item.children}
                />
              </div>
            );
          })}
        </div>
      </div>
      
      {submenuPosition && (
        <Submenu
          position={submenuPosition}
          items={items.find((item: any) => item.id === submenuPosition.parentId)?.children || []}
          onItemClick={handleMenuItemClick}
          onClose={handleSubmenuClose}
        />
      )}
    </>
  );
};

// Submenu Component
interface SubmenuProps {
  position: { x: number; y: number; parentId: string };
  items: any[];
  onItemClick: (item: any) => void;
  onClose: () => void;
}

const Submenu: React.FC<SubmenuProps> = ({ position, items, onItemClick, onClose }) => {
  const submenuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (submenuRef.current) {
      const rect = submenuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let x = position.x;
      let y = position.y;
      
      if (x + rect.width > viewportWidth) {
        x = position.x - rect.width - 10;
      }
      
      if (y + rect.height > viewportHeight) {
        y = viewportHeight - rect.height - 10;
      }
      
      submenuRef.current.style.left = `${x}px`;
      submenuRef.current.style.top = `${y}px`;
    }
  }, [position]);
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (submenuRef.current && !submenuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);
  
  return (
    <div
      ref={submenuRef}
      className="context-menu context-menu--submenu"
      style={{
        position: 'fixed',
        zIndex: 1001,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, index) => (
        <MenuItem
          key={item.id}
          label={item.label}
          icon={item.icon}
          shortcut={item.shortcut}
          disabled={item.disabled}
          onClick={() => onItemClick(item)}
        />
      ))}
    </div>
  );
};