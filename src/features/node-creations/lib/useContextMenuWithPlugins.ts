import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { showMenu } from '../model/slice';
import { PluginRegistry } from '@entities/plugin-node/model/pluginRegistry';
import { getPluginMenuItems } from '../ui/ContextMenu.tsx';

interface UseContextMenuWithPluginsProps {
  onConvertToCanvas?: (x: number, y: number) => { x: number; y: number };
}

export const useContextMenuWithPlugins = (props?: UseContextMenuWithPluginsProps) => {
  const dispatch = useDispatch();

  const showContextMenu = useCallback((
    e: React.MouseEvent,
    context?: {
      nodeId?: string;
      nodeIds?: string[];
      position?: { x: number; y: number };
    }
  ) => {
    e.preventDefault();
    
    const canvasPosition = props?.onConvertToCanvas 
      ? props.onConvertToCanvas(e.clientX, e.clientY)
      : { x: e.clientX, y: e.clientY };
    
    // Базовые пункты меню
    const baseItems: any[] = [
      {
        id: 'create-todo',
        label: '📝 Create Task',
        actionType: 'CREATE_TODO',
        payload: { position: canvasPosition },
      },
      {
        id: 'divider-1',
        id: 'divider',
      },
    ];
    
    // Пункты для выделенных нод (если есть)
    if (context?.nodeId) {
      baseItems.push(
        {
          id: 'delete-node',
          label: '🗑️ Delete',
          actionType: 'DELETE_NODE',
          shortcut: 'Del',
        },
        {
          id: 'divider-2',
          id: 'divider',
        }
      );
    }
    
    if (context?.nodeIds && context.nodeIds.length > 1) {
      baseItems.push({
        id: 'delete-selected',
        label: `🗑️ Delete Selected (${context.nodeIds.length})`,
        actionType: 'DELETE_SELECTED_NODES',
        shortcut: 'Del',
      });
    }
    
    // Пункты для статуса и приоритета (если есть nodeId)
    if (context?.nodeId) {
      baseItems.push(
        {
          id: 'set-status',
          label: '🏷️ Set Status',
          children: [
            { id: 'status-todo', label: '📋 To Do', actionType: 'SET_STATUS', payload: { status: 'todo' } },
            { id: 'status-progress', label: '🔄 In Progress', actionType: 'SET_STATUS', payload: { status: 'in-progress' } },
            { id: 'status-done', label: '✅ Done', actionType: 'SET_STATUS', payload: { status: 'done' } },
          ],
        },
        {
          id: 'set-priority',
          label: '⚡ Set Priority',
          children: [
            { id: 'priority-low', label: '🟢 Low', actionType: 'SET_PRIORITY', payload: { priority: 'low' } },
            { id: 'priority-medium', label: '🟡 Medium', actionType: 'SET_PRIORITY', payload: { priority: 'medium' } },
            { id: 'priority-high', label: '🔴 High', actionType: 'SET_PRIORITY', payload: { priority: 'high' } },
          ],
        },
        { id: 'divider-3', id: 'divider' }
      );
    }
    
    // Генерируем пункты для плагинов
    const pluginItems = getPluginMenuItems(
      (pluginId) => {
        console.log(`Create plugin: ${pluginId}`);
      },
      true
    );
    
    // Добавляем разделитель перед плагинами
    let allItems = [...baseItems];
    if (pluginItems.length > 0) {
      allItems.push({ id: 'divider-plugins', id: 'divider' });
      allItems.push(...pluginItems.map(item => ({
        ...item,
        actionType: item.actionType || 'CREATE_PLUGIN_NODE',
        payload: { ...item.payload, position: canvasPosition },
      })));
    }
    
    dispatch(showMenu({
      position: { x: e.clientX, y: e.clientY },
      items: allItems,
      context: {
        ...context,
        position: canvasPosition,
        convertToCanvas: props?.onConvertToCanvas,
      },
    }));
  }, [dispatch, props?.onConvertToCanvas]);
  
  return { showContextMenu };
};