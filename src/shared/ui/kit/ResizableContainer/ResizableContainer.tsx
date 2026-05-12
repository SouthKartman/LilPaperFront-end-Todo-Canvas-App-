import React, { useState, useCallback, useRef, useEffect } from 'react';
import './ResizableContainer.css';

interface ResizableContainerProps {
  children: React.ReactNode;
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  onResize: (width: number, height: number) => void;
  disabled?: boolean;
}

export const ResizableContainer: React.FC<ResizableContainerProps> = ({
  children,
  width,
  height,
  minWidth = 100,
  minHeight = 100,
  maxWidth = 2000,
  maxHeight = 2000,
  onResize,
  disabled = false,
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [direction, setDirection] = useState<string>('');
  const startPosRef = useRef({ x: 0, y: 0 });
  const startSizeRef = useRef({ width: 0, height: 0 });

  const handleResizeStart = useCallback((e: React.MouseEvent, dir: string) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setDirection(dir);
    startPosRef.current = { x: e.clientX, y: e.clientY };
    startSizeRef.current = { width, height };
  }, [disabled, width, height]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const dx = e.clientX - startPosRef.current.x;
    const dy = e.clientY - startPosRef.current.y;
    
    let newWidth = startSizeRef.current.width;
    let newHeight = startSizeRef.current.height;
    
    if (direction.includes('e')) {
      newWidth = startSizeRef.current.width + dx;
    }
    if (direction.includes('w')) {
      newWidth = startSizeRef.current.width - dx;
    }
    if (direction.includes('s')) {
      newHeight = startSizeRef.current.height + dy;
    }
    if (direction.includes('n')) {
      newHeight = startSizeRef.current.height - dy;
    }
    
    // Apply constraints
    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
    
    onResize(newWidth, newHeight);
  }, [isResizing, direction, minWidth, maxWidth, minHeight, maxHeight, onResize]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    setDirection('');
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
      return () => {
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  return (
    <div
      className="resizable-container"
      style={{
        width,
        height,
        position: 'relative',
      }}
    >
      {children}
      
      {!disabled && (
        <>
          <div
            className="resize-handle resize-se"
            onMouseDown={(e) => handleResizeStart(e, 'se')}
          />
          <div
            className="resize-handle resize-ne"
            onMouseDown={(e) => handleResizeStart(e, 'ne')}
          />
          <div
            className="resize-handle resize-sw"
            onMouseDown={(e) => handleResizeStart(e, 'sw')}
          />
          <div
            className="resize-handle resize-nw"
            onMouseDown={(e) => handleResizeStart(e, 'nw')}
          />
          <div
            className="resize-handle resize-e"
            onMouseDown={(e) => handleResizeStart(e, 'e')}
          />
          <div
            className="resize-handle resize-w"
            onMouseDown={(e) => handleResizeStart(e, 'w')}
          />
          <div
            className="resize-handle resize-n"
            onMouseDown={(e) => handleResizeStart(e, 'n')}
          />
          <div
            className="resize-handle resize-s"
            onMouseDown={(e) => handleResizeStart(e, 's')}
          />
        </>
      )}
    </div>
  );
};