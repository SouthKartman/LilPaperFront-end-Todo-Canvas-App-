import React, { useState, useRef, useCallback } from 'react';
import { Group, Rect, Text, Circle, Tag, Transformer } from 'react-konva';
import { Todo } from '@entities/todo/model/types';
import { useAppDispatch } from '@shared/lib/state';
import { 
  moveTodo, 
  resizeTodo,
  updateTodo,
  setTodoPriority,
  setTodoStatus,
  duplicateTodo,
  removeTodoTag
} from '../../model/slice';

interface KonvaTodoNodeProps {
  node: Todo & {
    zIndex?: number;
    isEditing?: boolean;
    type?: 'default' | 'checklist' | 'note' | 'urgent';
  };
  scale: number;
  isSelected: boolean;
  onSelect: (nodeId: string, multiSelect?: boolean) => void;
  onDoubleClick: (nodeId: string) => void;
  onContextMenu: (nodeId: string, position: { x: number; y: number }) => void;
}

// Константы стилей из CSS
const KONVA_NODE_STYLES = {
  // Из .node
  width: 220,
  minHeight: 150,
  background: '#ffffff',
  borderWidth: 2,
  borderRadius: 8,
  padding: 12,
  
  // Тени и эффекты
  shadowColor: 'rgba(0, 0, 0, 0.1)',
  shadowBlur: 5,
  shadowOffsetX: 0,
  shadowOffsetY: 2,
  shadowOpacity: 0.5,
  
  // Hover эффекты
  hoverShadowBlur: 8,
  hoverShadowOffsetY: 4,
  hoverTransformY: -2,
  
  // Dragging эффекты
  draggingOpacity: 0.7,
  draggingScale: 1.05,
  draggingShadowBlur: 10,
  draggingShadowOffsetY: 4,
  
  // Из .header
  headerMarginBottom: 8,
  headerGap: 8,
  
  // Из .title
  titleFontSize: 14,
  titleFontWeight: 600,
  titleColor: '#1f2937',
  titleLineHeight: 1.4,
  titleFontFamily: 'Inter, -apple-system, sans-serif',
  
  // Из .status
  statusFontSize: 11,
  statusFontWeight: 500,
  statusPaddingHorizontal: 8,
  statusPaddingVertical: 2,
  statusBorderRadius: 12,
  
  // Из .description
  descriptionFontSize: 12,
  descriptionColor: '#6b7280',
  descriptionLineHeight: 1.4,
  descriptionMinHeight: 34,
  descriptionPlaceholderColor: '#9ca3af',
  descriptionPlaceholderStyle: 'italic',
  
  // Из .footer
  footerFontSize: 11,
  footerMarginTop: 8,
  
  // Из .priority
  priorityFontSize: 11,
  priorityFontWeight: 500,
  
  // Из .metadata
  metadataFontSize: 12,
  metadataColor: '#6b7280',
  metadataGap: 8,
  
  // Из .createdDate
  createdDateFontSize: 11,
  createdDateOpacity: 0.7,
  
  // Из .dueDate
  dueDateColor: '#9ca3af',
  
  // Из .tags
  tagsMarginTop: 8,
  tagsGap: 4,
  
  // Из .tag
  tagBackground: '#f3f4f6',
  tagTextColor: '#6b7280',
  tagFontSize: 10,
  tagPaddingHorizontal: 6,
  tagPaddingVertical: 2,
  tagBorderRadius: 4,
  tagLineHeight: 1,
  
  // Из .dragHandle
  dragHandleFontSize: 12,
  dragHandleOpacity: 0.3,
  dragHandleHoverOpacity: 0.6,
  
  // Из .selected
  selectedOutlineWidth: 2,
  selectedOutlineColor: '#3b82f6',
  selectedOutlineOffset: 2,
  selectedBackground: '#f0f9ff',
  
  // Из .selectionIndicator
  selectionIndicatorBorderWidth: 2,
  selectionIndicatorBorderColor: '#3b82f6',
  selectionIndicatorBorderRadius: 8,
  selectionIndicatorDash: [4, 4],
  
  // Из .typeIcon
  typeIconFontSize: 16,
  
  // Из .titleInput
  titleInputBorder: '#e5e7eb',
  titleInputBorderRadius: 4,
  titleInputPadding: '4px 8px',
  titleInputFocusBorder: '#3b82f6',
  titleInputFocusShadow: '0 0 0 1px #3b82f6',
  
  // Из .quickActions
  quickActionsOpacity: 0,
  quickActionsHoverOpacity: 1,
  
  // Из .quickAction
  quickActionSize: 24,
  quickActionBorder: '#e5e7eb',
  quickActionBackground: 'white',
  quickActionBorderRadius: 4,
  quickActionFontSize: 12,
  quickActionHoverBackground: '#f3f4f6',
  quickActionHoverBorder: '#d1d5db',
};

export const KonvaTodoNode: React.FC<KonvaTodoNodeProps> = ({
  node,
  scale,
  isSelected,
  onSelect,
  onDoubleClick,
  onContextMenu,
}) => {
  const dispatch = useAppDispatch();
  const nodeRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  
  // Цвета для статусов
  const getStatusColor = (status: Todo['status']): string => {
    switch (status) {
      case 'todo': return '#6b7280';
      case 'in-progress': return '#f59e0b';
      case 'done': return '#10b981';
      case 'blocked': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // Текст статуса
  const getStatusText = (status: Todo['status']): string => {
    switch (status) {
      case 'todo': return 'К выполнению';
      case 'in-progress': return 'В процессе';
      case 'done': return 'Выполнено';
      case 'blocked': return 'Заблокировано';
      default: return status;
    }
  };

  // Цвета для приоритетов
  const getPriorityColor = (priority: Todo['priority']): string => {
    switch (priority) {
      case 'low': return '#6b7280';
      case 'medium': return '#f59e0b';
      case 'high': return '#ef4444';
      case 'critical': return '#7c3aed';
      default: return '#6b7280';
    }
  };

  // Текст приоритета
  const getPriorityText = (priority: Todo['priority']): string => {
    switch (priority) {
      case 'critical': return 'Критический';
      case 'high': return 'Высокий';
      case 'medium': return 'Средний';
      case 'low': return 'Низкий';
      default: return priority;
    }
  };

  // Иконка для типа задачи
  const getTypeIcon = (): string => {
    switch (node.type) {
      case 'checklist': return '✅';
      case 'urgent': return '🚨';
      case 'note': return '📝';
      default: return '📋';
    }
  };

  // Обработчики событий
  const handleDragStart = useCallback((e: any) => {
    setIsDragging(true);
    dragStartPos.current = { x: e.target.x(), y: e.target.y() };
    
    if (!e.evt.ctrlKey && !e.evt.metaKey && !e.evt.shiftKey) {
      onSelect(node.id, false);
    }
  }, [node.id, onSelect]);

  const handleDragEnd = useCallback((e: any) => {
    setIsDragging(false);
    
    const newPos = { x: e.target.x(), y: e.target.y() };
    if (newPos.x !== dragStartPos.current.x || newPos.y !== dragStartPos.current.y) {
      dispatch(moveTodo({ id: node.id, position: newPos }));
    }
  }, [dispatch, node.id]);

  const handleClick = useCallback((e: any) => {
    e.cancelBubble = true;
    const multiSelect = e.evt.ctrlKey || e.evt.metaKey || e.evt.shiftKey;
    onSelect(node.id, multiSelect);
  }, [node.id, onSelect]);

  const handleDoubleClick = useCallback((e: any) => {
    e.cancelBubble = true;
    onDoubleClick(node.id);
  }, [node.id, onDoubleClick]);

  const handleContextMenu = useCallback((e: any) => {
    e.evt.preventDefault();
    e.cancelBubble = true;
    onContextMenu(node.id, { x: e.evt.clientX, y: e.evt.clientY });
  }, [node.id, onContextMenu]);

  const handleTransformEnd = useCallback((e: any) => {
    const nodeRefCurrent = nodeRef.current;
    if (!nodeRefCurrent) return;
    
    const scaleX = nodeRefCurrent.scaleX();
    const scaleY = nodeRefCurrent.scaleY();
    
    // Сбрасываем масштаб
    nodeRefCurrent.scaleX(1);
    nodeRefCurrent.scaleY(1);
    
    // Обновляем размер
    dispatch(resizeTodo({
      id: node.id,
      size: {
        width: Math.max(100, nodeRefCurrent.width() * scaleX),
        height: Math.max(80, nodeRefCurrent.height() * scaleY),
      },
    }));
  }, [dispatch, node.id]);

  const handleStatusClick = useCallback((e: any) => {
    e.cancelBubble = true;
    const statusOrder = ['todo', 'in-progress', 'done', 'blocked'] as const;
    const currentIndex = statusOrder.indexOf(node.status);
    const nextIndex = (currentIndex + 1) % statusOrder.length;
    dispatch(setTodoStatus({
      id: node.id,
      status: statusOrder[nextIndex]
    }));
  }, [dispatch, node.id, node.status]);

  const handlePriorityClick = useCallback((e: any) => {
    e.cancelBubble = true;
    const priorityOrder = ['low', 'medium', 'high', 'critical'] as const;
    const currentIndex = priorityOrder.indexOf(node.priority);
    const nextIndex = (currentIndex + 1) % priorityOrder.length;
    dispatch(setTodoPriority({
      id: node.id,
      priority: priorityOrder[nextIndex]
    }));
  }, [dispatch, node.id, node.priority]);

  const handleCompleteClick = useCallback((e: any) => {
    e.cancelBubble = true;
    dispatch(setTodoStatus({
      id: node.id,
      status: 'done'
    }));
  }, [dispatch, node.id]);

  const handleDuplicateClick = useCallback((e: any) => {
    e.cancelBubble = true;
    dispatch(duplicateTodo(node.id));
  }, [dispatch, node.id]);

  const handleTagClick = useCallback((tag: string) => (e: any) => {
    e.cancelBubble = true;
    dispatch(removeTodoTag({ id: node.id, tag }));
  }, [dispatch, node.id]);

  // Размеры ноды
  const width = node.size?.width || KONVA_NODE_STYLES.width;
  const height = node.size?.height || KONVA_NODE_STYLES.minHeight;
  const cornerRadius = KONVA_NODE_STYLES.borderRadius;
  const padding = KONVA_NODE_STYLES.padding;
  const headerHeight = 40;
  
  // Вычисляем высоту контента
  const descriptionHeight = node.description 
    ? Math.max(KONVA_NODE_STYLES.descriptionMinHeight, 
               node.description.length > 100 ? 60 : 40)
    : KONVA_NODE_STYLES.descriptionMinHeight;
  
  const tagsHeight = node.tags && node.tags.length > 0 ? 20 : 0;
  const footerHeight = 30;
  
  const totalHeight = padding * 2 + headerHeight + descriptionHeight + tagsHeight + footerHeight;

  // Стили для hover/dragging
  const shadowBlur = isDragging 
    ? KONVA_NODE_STYLES.draggingShadowBlur 
    : isHovered 
      ? KONVA_NODE_STYLES.hoverShadowBlur 
      : KONVA_NODE_STYLES.shadowBlur;
  
  const shadowOffsetY = isDragging 
    ? KONVA_NODE_STYLES.draggingShadowOffsetY 
    : isHovered 
      ? KONVA_NODE_STYLES.hoverShadowOffsetY 
      : KONVA_NODE_STYLES.shadowOffsetY;
  
  const opacity = isDragging ? KONVA_NODE_STYLES.draggingOpacity : 1;
  const scaleFactor = isDragging ? KONVA_NODE_STYLES.draggingScale : 1;

  return (
    <>
      <Group
        ref={nodeRef}
        x={node.position.x}
        y={node.position.y}
        width={width}
        height={totalHeight}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
        onDblClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onTransformEnd={handleTransformEnd}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        scaleX={1 / scale}
        scaleY={1 / scale}
        shadowEnabled={true}
        perfectDrawEnabled={false}
        opacity={opacity}
        scaleX={1 / scale * scaleFactor}
        scaleY={1 / scale * scaleFactor}
      >
        {/* Фон ноды */}
        <Rect
          width={width}
          height={totalHeight}
          fill={isSelected ? KONVA_NODE_STYLES.selectedBackground : KONVA_NODE_STYLES.background}
          stroke={getStatusColor(node.status)}
          strokeWidth={KONVA_NODE_STYLES.borderWidth}
          cornerRadius={cornerRadius}
          shadowColor={KONVA_NODE_STYLES.shadowColor}
          shadowBlur={shadowBlur}
          shadowOffset={{ x: 0, y: shadowOffsetY }}
          shadowOpacity={KONVA_NODE_STYLES.shadowOpacity}
        />
        
        {/* Шапка с заголовком */}
        <Group y={padding}>
          <Rect
            width={width}
            height={headerHeight}
            fill={getStatusColor(node.status)}
            cornerRadius={[cornerRadius, cornerRadius, 0, 0]}
            opacity={0.9}
          />
          
          {/* Иконка типа */}
          <Text
            x={padding}
            y={padding}
            text={getTypeIcon()}
            fontSize={KONVA_NODE_STYLES.typeIconFontSize}
            fill="#ffffff"
          />
          
          {/* Заголовок */}
          <Text
            x={padding + KONVA_NODE_STYLES.typeIconFontSize + 8}
            y={padding + 2}
            width={width - (padding * 2) - KONVA_NODE_STYLES.typeIconFontSize - 8 - 80}
            text={node.title}
            fontSize={KONVA_NODE_STYLES.titleFontSize}
            fontFamily={KONVA_NODE_STYLES.titleFontFamily}
            fill="#ffffff"
            fontStyle="bold"
            ellipsis={true}
            padding={2}
          />
          
          {/* Статус (кликабельный) */}
          <Group
            x={width - 80}
            y={padding}
            onClick={handleStatusClick}
            onTap={handleStatusClick}
          >
            <Rect
              width={70}
              height={20}
              fill={getStatusColor(node.status)}
              cornerRadius={KONVA_NODE_STYLES.statusBorderRadius}
            />
            <Text
              x={8}
              y={4}
              text={getStatusText(node.status)}
              fontSize={KONVA_NODE_STYLES.statusFontSize}
              fontFamily={KONVA_NODE_STYLES.titleFontFamily}
              fill="#ffffff"
              fontStyle={KONVA_NODE_STYLES.statusFontWeight}
            />
          </Group>
        </Group>
        
        {/* Описание */}
        <Group y={padding + headerHeight}>
          <Rect
            x={padding}
            y={0}
            width={width - (padding * 2)}
            height={descriptionHeight}
            fill="transparent"
            onClick={() => setIsEditingDesc(true)}
            onTap={() => setIsEditingDesc(true)}
          />
          <Text
            x={padding}
            y={4}
            width={width - (padding * 2)}
            text={node.description || 'Кликните для добавления описания...'}
            fontSize={KONVA_NODE_STYLES.descriptionFontSize}
            fontFamily={KONVA_NODE_STYLES.titleFontFamily}
            fill={node.description ? KONVA_NODE_STYLES.descriptionColor : KONVA_NODE_STYLES.descriptionPlaceholderColor}
            lineHeight={KONVA_NODE_STYLES.descriptionLineHeight}
            padding={4}
            fontStyle={!node.description ? KONVA_NODE_STYLES.descriptionPlaceholderStyle : 'normal'}
          />
        </Group>
        
        {/* Приоритет (кликабельный) */}
        <Group 
          y={padding + headerHeight + descriptionHeight + 8}
          onClick={handlePriorityClick}
          onTap={handlePriorityClick}
        >
          <Text
            x={padding}
            y={0}
            text={`Приоритет: ${getPriorityText(node.priority)}`}
            fontSize={KONVA_NODE_STYLES.priorityFontSize}
            fontFamily={KONVA_NODE_STYLES.titleFontFamily}
            fill={getPriorityColor(node.priority)}
            fontStyle={KONVA_NODE_STYLES.priorityFontWeight}
            textDecoration={isHovered ? 'underline' : 'none'}
          />
        </Group>
        
        {/* Метаданные */}
        <Group y={padding + headerHeight + descriptionHeight + 24}>
          {node.dueDate && (
            <Text
              x={padding}
              y={0}
              text={`📅 ${new Date(node.dueDate).toLocaleDateString('ru-RU')}`}
              fontSize={KONVA_NODE_STYLES.metadataFontSize}
              fontFamily={KONVA_NODE_STYLES.titleFontFamily}
              fill={KONVA_NODE_STYLES.dueDateColor}
              textDecoration={isHovered ? 'underline' : 'none'}
            />
          )}
          
          <Text
            x={width - padding - 100}
            y={0}
            text={`📌 ${new Date(node.createdAt).toLocaleDateString('ru-RU')}`}
            fontSize={KONVA_NODE_STYLES.createdDateFontSize}
            fontFamily={KONVA_NODE_STYLES.titleFontFamily}
            fill={KONVA_NODE_STYLES.metadataColor}
            opacity={KONVA_NODE_STYLES.createdDateOpacity}
          />
        </Group>
        
        {/* Теги */}
        {node.tags && node.tags.length > 0 && (
          <Group y={padding + headerHeight + descriptionHeight + footerHeight}>
            {node.tags.slice(0, 3).map((tag, index) => (
              <Group
                key={tag}
                x={padding + index * 70}
                y={0}
                onClick={handleTagClick(tag)}
                onTap={handleTagClick(tag)}
              >
                <Rect
                  width={65}
                  height={16}
                  fill={KONVA_NODE_STYLES.tagBackground}
                  cornerRadius={KONVA_NODE_STYLES.tagBorderRadius}
                  opacity={isHovered ? 0.9 : 1}
                />
                <Text
                  x={4}
                  y={3}
                  text={tag}
                  fontSize={KONVA_NODE_STYLES.tagFontSize}
                  fontFamily={KONVA_NODE_STYLES.titleFontFamily}
                  fill={KONVA_NODE_STYLES.tagTextColor}
                  lineHeight={KONVA_NODE_STYLES.tagLineHeight}
                />
                {isHovered && (
                  <Text
                    x={55}
                    y={2}
                    text="×"
                    fontSize={KONVA_NODE_STYLES.tagFontSize + 2}
                    fontFamily={KONVA_NODE_STYLES.titleFontFamily}
                    fill={KONVA_NODE_STYLES.tagTextColor}
                    opacity={0.8}
                  />
                )}
              </Group>
            ))}
            {node.tags.length > 3 && (
              <Group x={padding + 210} y={0}>
                <Rect
                  width={30}
                  height={16}
                  fill="#d1d5db"
                  cornerRadius={KONVA_NODE_STYLES.tagBorderRadius}
                />
                <Text
                  x={8}
                  y={3}
                  text={`+${node.tags.length - 3}`}
                  fontSize={KONVA_NODE_STYLES.tagFontSize}
                  fontFamily={KONVA_NODE_STYLES.titleFontFamily}
                  fill={KONVA_NODE_STYLES.metadataColor}
                />
              </Group>
            )}
          </Group>
        )}
        
        {/* Индикатор перемещения */}
        {isHovered && !isDragging && (
          <Group x={width - 30} y={padding + 8}>
            <Text
              text="⋮⋮"
              fontSize={KONVA_NODE_STYLES.dragHandleFontSize}
              fontFamily={KONVA_NODE_STYLES.titleFontFamily}
              fill="#000000"
              opacity={KONVA_NODE_STYLES.dragHandleOpacity}
            />
          </Group>
        )}
        
        {/* Быстрые действия */}
        {isHovered && !isDragging && (
          <Group x={width - 60} y={padding + 4}>
            {/* Кнопка выполнения */}
            <Group
              onClick={handleCompleteClick}
              onTap={handleCompleteClick}
            >
              <Rect
                width={KONVA_NODE_STYLES.quickActionSize}
                height={KONVA_NODE_STYLES.quickActionSize}
                fill={KONVA_NODE_STYLES.quickActionBackground}
                stroke={KONVA_NODE_STYLES.quickActionBorder}
                strokeWidth={1}
                cornerRadius={KONVA_NODE_STYLES.quickActionBorderRadius}
              />
              <Text
                x={8}
                y={4}
                text="✓"
                fontSize={KONVA_NODE_STYLES.quickActionFontSize}
                fill="#10b981"
              />
            </Group>
            
            {/* Кнопка дублирования */}
            <Group
              x={KONVA_NODE_STYLES.quickActionSize + 4}
              y={0}
              onClick={handleDuplicateClick}
              onTap={handleDuplicateClick}
            >
              <Rect
                width={KONVA_NODE_STYLES.quickActionSize}
                height={KONVA_NODE_STYLES.quickActionSize}
                fill={KONVA_NODE_STYLES.quickActionBackground}
                stroke={KONVA_NODE_STYLES.quickActionBorder}
                strokeWidth={1}
                cornerRadius={KONVA_NODE_STYLES.quickActionBorderRadius}
              />
              <Text
                x={6}
                y={4}
                text="📄"
                fontSize={KONVA_NODE_STYLES.quickActionFontSize}
              />
            </Group>
          </Group>
        )}
        
        {/* Индикатор выделения */}
        {isSelected && !isDragging && (
          <Rect
            width={width + KONVA_NODE_STYLES.selectedOutlineOffset * 2}
            height={totalHeight + KONVA_NODE_STYLES.selectedOutlineOffset * 2}
            x={-KONVA_NODE_STYLES.selectedOutlineOffset}
            y={-KONVA_NODE_STYLES.selectedOutlineOffset}
            stroke={KONVA_NODE_STYLES.selectedOutlineColor}
            strokeWidth={KONVA_NODE_STYLES.selectedOutlineWidth}
            dash={KONVA_NODE_STYLES.selectionIndicatorDash}
            cornerRadius={cornerRadius + 2}
            listening={false}
          />
        )}
        
        {/* Анимация пульсации для выделения */}
        {isSelected && !isDragging && (
          <Rect
            width={width + 8}
            height={totalHeight + 8}
            x={-4}
            y={-4}
            stroke={KONVA_NODE_STYLES.selectionIndicatorBorderColor}
            strokeWidth={KONVA_NODE_STYLES.selectionIndicatorBorderWidth}
            cornerRadius={KONVA_NODE_STYLES.selectionIndicatorBorderRadius}
            listening={false}
            opacity={0.5}
            dash={KONVA_NODE_STYLES.selectionIndicatorDash}
            dashOffset={Date.now() / 50 % 20} // Анимация пульсации
          />
        )}
      </Group>
      
      {/* Transformer для изменения размера */}
      {isSelected && (
        <Transformer
          ref={transformerRef}
          nodes={[nodeRef.current]}
          boundBoxFunc={(oldBox, newBox) => {
            const minWidth = 100;
            const minHeight = 80;
            
            if (newBox.width < minWidth || newBox.height < minHeight) {
              return oldBox;
            }
            return newBox;
          }}
          rotateEnabled={false}
          enabledAnchors={[
            'top-left', 'top-center', 'top-right',
            'middle-left', 'middle-right',
            'bottom-left', 'bottom-center', 'bottom-right'
          ]}
          borderDash={KONVA_NODE_STYLES.selectionIndicatorDash}
          borderStroke={KONVA_NODE_STYLES.selectedOutlineColor}
          borderStrokeWidth={1}
          anchorStroke={KONVA_NODE_STYLES.selectedOutlineColor}
          anchorFill="#ffffff"
          anchorStrokeWidth={2}
          anchorSize={8}
          keepRatio={false}
        />
      )}
    </>
  );
};