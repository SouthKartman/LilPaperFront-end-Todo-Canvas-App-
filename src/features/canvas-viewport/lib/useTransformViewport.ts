// src/features/canvas-viewport/lib/useTransformViewport.ts
import { useCallback, useEffect, useRef } from 'react';
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
  zoomToPoint,
} from '../model/slice';
import { selectViewport } from '../model/selectors';

export const useEnhancedViewport = () => {
  const dispatch = useAppDispatch();
  const viewport = useAppSelector(selectViewport);

  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // Актуальные значения для обработчиков, регистрируемых один раз
  // (нативный wheel-listener вешается с passive:false, пересоздавать его нельзя).
  const viewportRef = useRef(viewport);
  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  // Нативный обработчик колеса: React вызывает onWheel через делегирование
  // как passive-слушатель, поэтому preventDefault() внутри React.WheelEvent
  // игнорируется браузером. Регистрируем слушатель напрямую.
  useEffect(() => {
    const el = document.getElementById('canvas-viewport-container');
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        // Зум с якорением точки под курсором (координаты относительно контейнера)
        const rect = el.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const delta = e.deltaY > 0 ? 0.8 : 1.2;
        const v = viewportRef.current;
        const newScale = Math.max(
          v.minScale,
          Math.min(v.maxScale, v.scale * delta)
        );
        dispatch(zoomToPoint({ point: { x: mouseX, y: mouseY }, targetScale: newScale }));
      } else {
        // Панорамирование колесом: deltaX всегда, deltaY — вертикаль
        // (для обычной мыши без боковой прокрутки это единственный способ).
        const d = viewportRef.current.isPanning ? 0 : 1;
        dispatch(panMove({ delta: { x: -e.deltaX * d, y: -e.deltaY * d } }));
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [dispatch]);

  // Начало панорамирования
  const handlePanStart = useCallback((e: React.MouseEvent) => {
    // Средняя кнопка мыши или Alt + левая
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      isPanning.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
      dispatch(panStart());
      document.body.style.cursor = 'grabbing';
    }
  }, [dispatch]);

  // Панорамирование (вызывается из глобального обработчика).
  // Используем дельту (panMove), а не абсолютную позицию, чтобы избежать
  // устаревших замыканий и «прыжков» при рассинхронизации состояния.
  const handlePanMove = useCallback((e: MouseEvent) => {
    if (!isPanning.current) return;

    const deltaX = e.clientX - lastPos.current.x;
    const deltaY = e.clientY - lastPos.current.y;

    if (deltaX !== 0 || deltaY !== 0) {
      dispatch(panMove({ delta: { x: deltaX, y: deltaY } }));
      lastPos.current = { x: e.clientX, y: e.clientY };
    }
  }, [dispatch]);

  // Конец панорамирования
  const handlePanEnd = useCallback(() => {
    if (isPanning.current) {
      isPanning.current = false;
      dispatch(panEnd());
      document.body.style.cursor = '';
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

  // Zoom in/out (от центра экрана — координаты относительно контейнера)
  const getCenterPoint = () => {
    const el = document.getElementById('canvas-viewport-container');
    if (!el) return undefined;
    const rect = el.getBoundingClientRect();
    return { x: rect.width / 2, y: rect.height / 2 };
  };

  const handleZoomIn = useCallback(() => {
    dispatch(zoomIn({ point: getCenterPoint() }));
  }, [dispatch]);

  const handleZoomOut = useCallback(() => {
    dispatch(zoomOut({ point: getCenterPoint() }));
  }, [dispatch]);

  // Toggle grid
  const handleToggleGrid = useCallback(() => {
    dispatch(toggleGrid());
  }, [dispatch]);

  return {
    // Состояние
    viewport,
    isPanning: viewport.isPanning,

    // Обработчики событий
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    handleKeyDown,

    // Действия
    handleZoomIn,
    handleZoomOut,
    handleResetViewport,
    handleToggleGrid,
    setPosition: (p: { x: number; y: number }) => dispatch(setPosition(p)),

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
