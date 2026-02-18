// src/features/canvas-viewport/ui/ZoomControls.tsx
import React from 'react';
import { useEffect } from 'react';
import { useEnhancedViewport } from '../lib/useTransformViewport';
import styles from './ZoomControls.module.css';

export const ZoomControls: React.FC = () => {
  const {
    viewport,
    handlePanMove,
    handlePanEnd,
    handleKeyDown,
    handleZoomIn,
    handleZoomOut,
    handleResetViewport,
    handleToggleGrid,
  } = useEnhancedViewport();

  // Глобальные обработчики для панорамирования
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      handlePanMove(e);
    };
    
    const handleGlobalMouseUp = () => {
      handlePanEnd();
      document.body.style.cursor = '';
    };
    
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      handleKeyDown(e);
    };
    
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('keydown', handleGlobalKeyDown);
    
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [handlePanMove, handlePanEnd, handleKeyDown]);

  return (
    
    /* Контролы зума (опционально, можно добавить в тулбар) */
    <div className={styles.viewportControls}>
      <button 
        onClick={handleZoomOut} 
        title="Уменьшить (Ctrl+-)"
      >
        −
      </button>
      <span>{Math.round(viewport.scale * 100)}%</span>
      <button 
        onClick={handleZoomIn} 
        title="Увеличить (Ctrl+=)"
      >
        +
      </button>
      <button 
        onClick={handleResetViewport} 
        title="Сбросить (Ctrl+0)"
      >
        Сброс
      </button>
      <button 
        onClick={handleToggleGrid} 
        className={viewport.showGrid ? styles.active : ''}
        title="Сетка (Ctrl+G)"
      >
        Сетка
      </button>
    </div>
  );
};

export default ZoomControls;