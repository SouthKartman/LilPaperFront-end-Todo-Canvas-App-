// src/features/canvas-viewport/lib/useEnhancedViewport.ts
import { useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@shared/lib/state';
import { 
  zoomIn, 
  zoomOut, 
  panStart, 
  panMove, 
  panEnd,
  resetViewport,
  setPosition,
  toggleGrid,
} from '../model/slice';
import { selectViewport } from '../model/selectors';

export const useEnhancedViewport = () => {
  const dispatch = useAppDispatch();
  const viewport = useAppSelector(selectViewport);
  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // Обработчик колеса мыши
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    if (e.ctrlKey || e.metaKey) {
      // Zoom с Ctrl/Cmd
      const delta = e.deltaY > 0 ? 0.8 : 1.2;
      const rect = e.currentTarget.getBoundingClientRect();
      
      // Координаты курсора относительно контейнера
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Вычисляем позицию до зума
      const oldX = viewport.position.x;
      const oldY = viewport.position.y;
      const oldScale = viewport.scale;
      const newScale = Math.max(
        viewport.minScale,
        Math.min(viewport.maxScale, oldScale * delta)
      );
      
      // Вычисляем смещение для сохранения точки под курсором
      const newX = mouseX - (mouseX - oldX) * (newScale / oldScale);
      const newY = mouseY - (mouseY - oldY) * (newScale / oldScale);
      
      dispatch(setPosition({ x: newX, y: newY }));
      dispatch({ type: 'viewport/setScale', payload: newScale });
    } else {
      // Панорамирование
      const newX = viewport.position.x - e.deltaX;
      const newY = viewport.position.y - e.deltaY;
      dispatch(setPosition({ x: newX, y: newY }));
    }
  }, [dispatch, viewport]);

  // Начало панорамирования
  const handlePanStart = useCallback((e: React.MouseEvent) => {
    // Средняя кнопка мыши или Alt + левая
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      isPanning.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
      dispatch(panStart());
      (e.currentTarget as HTMLElement).style.cursor = 'grabbing';
    }
  }, [dispatch]);

  // Панорамирование (вызывается из глобального обработчика)
  const handlePanMove = useCallback((e: MouseEvent) => {
    if (!isPanning.current) return;
    
    const deltaX = e.clientX - lastPos.current.x;
    const deltaY = e.clientY - lastPos.current.y;
    
    const newX = viewport.position.x + deltaX;
    const newY = viewport.position.y + deltaY;
    
    dispatch(setPosition({ x: newX, y: newY }));
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, [dispatch, viewport.position]);

  // Конец панорамирования
  const handlePanEnd = useCallback(() => {
    if (isPanning.current) {
      isPanning.current = false;
      dispatch(panEnd());
    }
  }, [dispatch]);

  // Горячие клавиши
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
  
    
    // Ctrl + = для зума
    if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
      e.preventDefault();
      dispatch(zoomIn({}));
    }
    
    // Ctrl + - для зума
    if ((e.ctrlKey || e.metaKey) && e.key === '-') {
      e.preventDefault();
      dispatch(zoomOut({}));
    }
    
    // Ctrl + 0 для сброса
    if ((e.ctrlKey || e.metaKey) && e.key === '0') {
      e.preventDefault();
      dispatch(resetViewport());
    }
    
    // Ctrl + G для сетки
    if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
      e.preventDefault();
      dispatch(toggleGrid());
    }
  }, [dispatch]);

  // Сброс viewport
  const handleResetViewport = useCallback(() => {
    dispatch(resetViewport());
  }, [dispatch]);

  // Zoom in/out
  const handleZoomIn = useCallback(() => {
    dispatch(zoomIn({}));
  }, [dispatch]);

  const handleZoomOut = useCallback(() => {
    dispatch(zoomOut({}));
  }, [dispatch]);

  // Toggle grid
  const handleToggleGrid = useCallback(() => {
    dispatch(toggleGrid());
  }, [dispatch]);

  return {
    // Состояние
    viewport,
    isPanning: isPanning.current,
    
    // Обработчики событий
    handleWheel,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    handleKeyDown,
    
    // Действия
    handleZoomIn,
    handleZoomOut,
    handleResetViewport,
    handleToggleGrid,
    
    // Утилиты
    getTransformStyle: {
      transform: `translate(${viewport.position.x}px, ${viewport.position.y}px) scale(${viewport.scale})`,
      transformOrigin: '0 0',
    },
    
    getGridStyle: {
      backgroundSize: `${viewport.gridSize * viewport.scale}px ${viewport.gridSize * viewport.scale}px`,
      backgroundPosition: `${viewport.position.x}px ${viewport.position.y}px`,
      opacity: viewport.scale < 0.3 ? 0.2 : 0.4,
    },
  };
};