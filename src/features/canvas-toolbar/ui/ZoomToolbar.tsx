import React, { useEffect } from "react";
import "./ZoomToolbar.css";
import { useEnhancedViewport } from "@features/canvas-viewport/lib/useTransformViewport";

export const ZoomToolbar: React.FC = () => {
  const {
    viewport,
    handlePanMove,
    handlePanEnd,
    handleKeyDown,
    handleZoomIn,
    handleZoomOut,
    handleResetViewport,
    // handleToggleGrid,
  } = useEnhancedViewport();

  // НА клаву 

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
    <div className="Zoom-toolbar">
      <div className="Zoom-container">
        <div className="Zoom-percent">
          <span>{Math.round(viewport.scale * 100)}%</span>
        </div>
        <button className="Zoom-btn" title="Увеличить (Ctrl+=)" onClick={handleZoomIn}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
        </button>
        <button className="Zoom-btn" title="Уменьшить (Ctrl+-)" onClick={handleZoomOut}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M5 12h14" />
          </svg>
        </button>
        <button className="Zoom-btn" title="Сбросить (Ctrl+0)" onClick={handleResetViewport}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M3 7V5a2 2 0 0 1 2-2h2" />
            <path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
            <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
            <rect width="10" height="8" x="7" y="8" rx="1" />
          </svg>
        </button>
      </div>
    </div>
  );
};
