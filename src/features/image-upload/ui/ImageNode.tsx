import React, { useRef, useState, useEffect } from 'react';
import { ImageNode as IImageNode } from '@entities/image/model/types';
import { ImagePreview } from '@shared/ui/kit/ImagePreview/ImagePreview';
import { useAppDispatch } from '@shared/lib/state';
import { useCanvasDnd } from '@features/canvas-dnd/lib/useCanvasDnd';
import { useProjectImage } from '../lib/useProjectImage'; // Новый хук
import { FileService } from '@shared/lib/dom/fileService'; // Для удаления файлов
import { 
  moveImageNode, 
  resizeImageNode, 
  selectImageNode, 
  deleteImageNode,
  setImageZIndex,
  deselectImageNode 
} from '../model/slice';
import styles from './ImageNode.module.css';

interface ImageNodeProps {
  node: IImageNode;
  isSelected?: boolean;
  viewport: { position: { x: number; y: number }; scale: number };
  onContextMenu?: (e: React.MouseEvent, nodeId: string) => void;
  onClick?: (e: React.MouseEvent, nodeId: string) => void;
  onDoubleClick?: (e: React.MouseEvent, nodeId: string) => void;
}

export const ImageNode: React.FC<ImageNodeProps> = ({
  node,
  isSelected = false,
  viewport,
  onContextMenu,
  onClick,
  onDoubleClick,
}) => {
  const dispatch = useAppDispatch();
  const nodeRef = useRef<HTMLDivElement>(null);
  const { handleDragStart, isDragging, draggedNodeId, dragState } = useCanvasDnd();
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string | null>(null);
  
  // Используем новый хук для загрузки изображения
  const { url: imageUrl, loading, error } = useProjectImage(node.id);
  
  // Для плавности используем requestAnimationFrame
  const rafRef = useRef<number>();
  const lastPositionRef = useRef<{ x: number; y: number }>({ x: node.position.x, y: node.position.y });

  // Эффект для плавного перемещения изображения во время DnD
  useEffect(() => {
    if (isDragging && draggedNodeId === node.id && dragState?.currentPosition && !isResizing) {
      
      const updatePosition = () => {
        // Находим canvas элемент
        const canvasElement = document.querySelector('[class*="canvas"]') as HTMLElement;
        if (!canvasElement) return;
        
        const rect = canvasElement.getBoundingClientRect();
        
        // Вычисляем позицию с учетом offset
        const mouseX = dragState.currentPosition.x - dragState.offset.x;
        const mouseY = dragState.currentPosition.y - dragState.offset.y;
        
        // Конвертируем экранные координаты в canvas координаты
        const relativeX = mouseX - rect.left;
        const relativeY = mouseY - rect.top;
        
        const canvasX = (relativeX - viewport.position.x) / viewport.scale;
        const canvasY = (relativeY - viewport.position.y) / viewport.scale;
        
        // Новая позиция с центрированием
        const newPosition = {
          x: canvasX - node.size.width / 2,
          y: canvasY - node.size.height / 2,
        };
        
        // Плавное обновление с интерполяцией
        const speed = 0.8;
        const smoothPosition = {
          x: lastPositionRef.current.x + (newPosition.x - lastPositionRef.current.x) * speed,
          y: lastPositionRef.current.y + (newPosition.y - lastPositionRef.current.y) * speed,
        };
        
        // Обновляем позицию только если изменение значительное
        const dx = Math.abs(smoothPosition.x - lastPositionRef.current.x);
        const dy = Math.abs(smoothPosition.y - lastPositionRef.current.y);
        
        if (dx > 0.1 || dy > 0.1) {
          dispatch(moveImageNode({
            id: node.id,
            position: smoothPosition
          }));
          lastPositionRef.current = smoothPosition;
        }
        
        rafRef.current = requestAnimationFrame(updatePosition);
      };
      
      rafRef.current = requestAnimationFrame(updatePosition);
      
      return () => {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
      };
    }
  }, [isDragging, draggedNodeId, dragState?.currentPosition, dragState?.offset, node.id, dispatch, viewport, node.size, isResizing]);

  // Сброс lastPosition при окончании перетаскивания
  useEffect(() => {
    if (!isDragging || draggedNodeId !== node.id) {
      lastPositionRef.current = { x: node.position.x, y: node.position.y };
    }
  }, [isDragging, draggedNodeId, node.id, node.position]);

  // Обработчик начала перетаскивания
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    
    if ((e.target as HTMLElement).closest(`.${styles.resizeHandle}`)) return;
    if ((e.target as HTMLElement).closest(`.${styles.actionButton}`)) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    if (!isSelected && !(e.ctrlKey || e.metaKey)) {
      dispatch(selectImageNode(node.id));
    }
    
    if (nodeRef.current) {
      const rect = nodeRef.current.getBoundingClientRect();
      handleDragStart(node.id, e, rect);
    }
  };

  const handleResizeStart = (e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = node.size.width;
    const startHeight = node.size.height;
    const startPos = { ...node.position };
    const aspectRatio = startWidth / startHeight;

    const handleResizeMove = (e: MouseEvent) => {
      const deltaX = (e.clientX - startX) / viewport.scale;
      const deltaY = (e.clientY - startY) / viewport.scale;
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      let newX = startPos.x;
      let newY = startPos.y;
      
      const preserveAspect = e.shiftKey;
      
      if (direction.includes('e')) {
        newWidth = Math.max(50, startWidth + deltaX);
        if (preserveAspect) newHeight = newWidth / aspectRatio;
      }
      if (direction.includes('w')) {
        newWidth = Math.max(50, startWidth - deltaX);
        newX = startPos.x + deltaX;
        if (preserveAspect) {
          newHeight = newWidth / aspectRatio;
          newY = startPos.y + (startHeight - newHeight);
        }
      }
      if (direction.includes('s')) {
        newHeight = Math.max(50, startHeight + deltaY);
        if (preserveAspect) newWidth = newHeight * aspectRatio;
      }
      if (direction.includes('n')) {
        newHeight = Math.max(50, startHeight - deltaY);
        newY = startPos.y + deltaY;
        if (preserveAspect) {
          newWidth = newHeight * aspectRatio;
          newX = startPos.x + (startWidth - newWidth);
        }
      }
      
      dispatch(resizeImageNode({
        id: node.id,
        size: { width: newWidth, height: newHeight }
      }));
      
      if (newX !== startPos.x || newY !== startPos.y) {
        dispatch(moveImageNode({
          id: node.id,
          position: { x: newX, y: newY }
        }));
      }
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
      setResizeDirection(null);
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (window.confirm(`Удалить изображение "${node.originalName}"?`)) {
      try {
        // Извлекаем projectId и fileName из filePath
        const pathMatch = node.filePath?.match(/\/images\/projects\/([^/]+)\/(.+)$/);
        if (pathMatch) {
          const [, projectId, fileName] = pathMatch;
          await FileService.deleteFile(projectId, fileName);
        }
        
        // Удаляем из Redux и IndexedDB
        dispatch(deleteImageNode(node.id));
      } catch (error) {
        console.error('❌ Ошибка удаления файла:', error);
        alert('Не удалось удалить файл');
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu?.(e, node.id);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(e, node.id);
    
    if (e.ctrlKey || e.metaKey) {
      if (isSelected) {
        dispatch(deselectImageNode(node.id));
      } else {
        dispatch(selectImageNode(node.id));
      }
    } else if (!isSelected) {
      dispatch(selectImageNode(node.id));
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDoubleClick?.(e, node.id);
  };

  const handleBringToFront = () => {
    dispatch(setImageZIndex({ id: node.id, zIndex: 1000 }));
  };

  const handleSendToBack = () => {
    dispatch(setImageZIndex({ id: node.id, zIndex: 1 }));
  };

  const isBeingDragged = isDragging && draggedNodeId === node.id;

  useEffect(() => {
    if (isBeingDragged) {
      handleBringToFront();
    }
  }, [isBeingDragged]);

  // Стили с CSS transition для плавности
  const nodeStyle: React.CSSProperties = {
    left: node.position.x,
    top: node.position.y,
    width: node.size.width,
    height: node.size.height,
    zIndex: node.zIndex,
  };

  // Рендерим состояние загрузки
  if (loading) {
    return (
      <div
        ref={nodeRef}
        className={`${styles.imageNode} ${styles.loading}`}
        style={nodeStyle}
      >
        <div className={styles.loadingSpinner}>🔄</div>
        <div className={styles.loadingText}>Загрузка...</div>
      </div>
    );
  }

  // Рендерим ошибку
  if (error || !imageUrl) {
    return (
      <div
        ref={nodeRef}
        className={`${styles.imageNode} ${styles.error}`}
        style={nodeStyle}
        title={node.originalName}
      >
        <div className={styles.errorPlaceholder}>
          <span>❌</span>
          <small>{node.originalName}</small>
          <button 
            className={styles.retryButton}
            onClick={() => window.location.reload()}
          >
            🔄 Повторить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={nodeRef}
      className={`
        ${styles.imageNode} 
        ${isBeingDragged ? styles.dragging : ''} 
        ${isSelected ? styles.selected : ''} 
        ${isResizing ? styles.resizing : ''}
      `}
      style={nodeStyle}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      data-node-id={node.id}
      data-node-type="image"
      title={`${node.originalName} (${Math.round(node.fileSize / 1024)} KB)`}
    >
      <ImagePreview
        src={imageUrl}
        alt={node.alt || node.originalName || 'image'}
        width={node.size.width}
        height={node.size.height}
        className={styles.imagePreview}
      />
      
      {isSelected && (
        <>
          {/* Ресайз хендлы */}
          <div className={`${styles.resizeHandle} ${styles.nw}`} onMouseDown={(e) => handleResizeStart(e, 'nw')} />
          <div className={`${styles.resizeHandle} ${styles.ne}`} onMouseDown={(e) => handleResizeStart(e, 'ne')} />
          <div className={`${styles.resizeHandle} ${styles.sw}`} onMouseDown={(e) => handleResizeStart(e, 'sw')} />
          <div className={`${styles.resizeHandle} ${styles.se}`} onMouseDown={(e) => handleResizeStart(e, 'se')} />
          <div className={`${styles.resizeHandle} ${styles.n}`} onMouseDown={(e) => handleResizeStart(e, 'n')} />
          <div className={`${styles.resizeHandle} ${styles.s}`} onMouseDown={(e) => handleResizeStart(e, 's')} />
          <div className={`${styles.resizeHandle} ${styles.e}`} onMouseDown={(e) => handleResizeStart(e, 'e')} />
          <div className={`${styles.resizeHandle} ${styles.w}`} onMouseDown={(e) => handleResizeStart(e, 'w')} />
          
          {/* Панель действий */}
          <div className={styles.actions}>
            <div className={styles.fileInfo}>
              <span className={styles.fileName}>
                {node.originalName.length > 20 
                  ? node.originalName.substring(0, 17) + '...' 
                  : node.originalName}
              </span>
            </div>
            
            <button 
              className={`${styles.actionButton} ${styles.bringToFront}`}
              onClick={handleBringToFront}
              title="На передний план"
            >
              ⬆️
            </button>
            
            <button 
              className={`${styles.actionButton} ${styles.sendToBack}`}
              onClick={handleSendToBack}
              title="На задний план"
            >
              ⬇️
            </button>
            
            <button 
              className={`${styles.actionButton} ${styles.delete}`} 
              onClick={handleDelete} 
              title="Удалить"
            >
              ×
            </button>
          </div>
        </>
      )}
      
      {/* Индикатор выделения */}
      {isSelected && <div className={styles.selectionIndicator} />}
      
      {/* Индикатор загрузки (для будущих анимаций) */}
      {(node as any).isUploading && (
        <div className={styles.uploadingOverlay}>
          <div className={styles.spinner} />
        </div>
      )}
    </div>
  );
};