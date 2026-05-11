// features/canvas-viewport/model/types.ts
export type ViewportState = {
  scale: number;           // Текущий масштаб (0.1 - 10)
  position: Vector2;       // Смещение холста {x, y}
  minScale: number;        // Минимальный зум (0.1)
  maxScale: number;        // Максимальный зум (10)
  gridSize: number;        // Размер сетки в пикселях (20)
  showGrid: boolean;       // Показывать сетку
  gridSnap: boolean;       // Привязка к сетке
  isPanning: boolean;      // Флаг панорамирования
};

// entities/canvas/model/types.ts
export type CanvasWorkspace = {
  id: string;
  size: { width: number; height: number };
  viewport: ViewportState;
  backgroundColor: string;
};