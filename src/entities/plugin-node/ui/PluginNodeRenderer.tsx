import React, { useRef } from 'react';
import { PluginNodeData, PluginComponentProps } from '../model/types';
import { PluginRegistry } from '../model/pluginRegistry';

interface PluginNodeRendererProps {
  node: PluginNodeData;
  isSelected?: boolean;
  isDragging?: boolean;
  onUpdate: (updates: Partial<PluginNodeData>) => void;
  onDelete?: () => void;
  onResize?: (width: number, height: number) => void;
  onDragStart?: (e: React.MouseEvent, nodeId: string, rect: DOMRect) => void;
  onClick?: (e: React.MouseEvent, nodeId: string) => void;
  onDoubleClick?: (e: React.MouseEvent, nodeId: string) => void;
  onContextMenu?: (e: React.MouseEvent, nodeId: string) => void;
}

export const PluginNodeRenderer: React.FC<PluginNodeRendererProps> = (props) => {
  if (!props || !props.node) {
    console.error('PluginNodeRenderer: props or node is undefined', props);
    return (
      <div style={{ 
        width: 200, 
        height: 150, 
        background: '#fef2f2', 
        border: '1px solid #fecaca',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#dc2626',
        fontSize: '12px',
        padding: '8px'
      }}>
        ⚠️ Ошибка: некорректные данные плагина
      </div>
    );
  }

  const { 
    node, 
    isSelected, 
    isDragging, 
    onUpdate, 
    onDelete, 
    onResize, 
    onDragStart,
    onClick,
    onDoubleClick,
    onContextMenu
  } = props;
  
  const nodeRef = useRef<HTMLDivElement>(null);
  
  const plugin = PluginRegistry.getPlugin(node.pluginId);
  
  if (!plugin) {
    return (
      <div 
        className="plugin-node-error"
        style={{
          width: node.width || 300,
          height: node.height || 200,
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '16px',
        }}
      >
        <div style={{ fontSize: '32px' }}>⚠️</div>
        <div style={{ fontSize: '14px', color: '#dc2626', textAlign: 'center' }}>
          Plugin "{node.pluginId}" not found
        </div>
        {onDelete && (
          <button
            onClick={onDelete}
            style={{
              padding: '4px 12px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Remove
          </button>
        )}
      </div>
    );
  }

  const Component = plugin.component;
  
  const handleDragStartWrapper = (e: React.MouseEvent) => {
    if (onDragStart && nodeRef.current) {
      const rect = nodeRef.current.getBoundingClientRect();
      onDragStart(e, node.id, rect);
    }
  };
  
  const componentProps: PluginComponentProps = {
    node,
    isSelected,
    isDragging: isDragging || false, // Явно передаем isDragging
    onUpdate,
    onDelete,
    onResize,
    onDragStart: handleDragStartWrapper,
    onClick: (e: React.MouseEvent) => {
      if (onClick) {
        onClick(e, node.id);
      }
    },
    onDoubleClick: (e: React.MouseEvent) => {
      if (onDoubleClick) {
        onDoubleClick(e, node.id);
      }
    },
    onContextMenu: (e: React.MouseEvent) => {
      if (onContextMenu) {
        onContextMenu(e, node.id);
      }
    },
  };

  return (
    <div ref={nodeRef}>
      <Component {...componentProps} />
    </div>
  );
};

export default PluginNodeRenderer;