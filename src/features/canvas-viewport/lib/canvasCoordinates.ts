
export interface Point {
  x: number;
  y: number;
}

export interface CanvasViewport {
  position: Point;
  scale: number;
}

export interface CanvasRect {
  left: number;
  top: number;
}

const MIN_SCALE = 0.0001;

/**
 * Переводит экранные координаты в координаты холста.
 */
export function screenToCanvas(
  screen: Point,
  canvasRect: CanvasRect,
  viewport: CanvasViewport,
): Point {
  const scale = Math.max(viewport.scale, MIN_SCALE);

  return {
    x:
      (screen.x - canvasRect.left - viewport.position.x) /
      scale,
    y:
      (screen.y - canvasRect.top - viewport.position.y) /
      scale,
  };
}

/**
 * Переводит координаты холста в экранные координаты.
 */
export function canvasToScreen(
  point: Point,
  canvasRect: CanvasRect,
  viewport: CanvasViewport,
): Point {
  return {
    x:
      canvasRect.left +
      viewport.position.x +
      point.x * viewport.scale,
    y:
      canvasRect.top +
      viewport.position.y +
      point.y * viewport.scale,
  };
}

/**
 * Вычисляет точку захвата относительно начала узла.
 */
export function getGrabOffset(
  pointerCanvas: Point,
  nodePosition: Point,
): Point {
  return {
    x: pointerCanvas.x - nodePosition.x,
    y: pointerCanvas.y - nodePosition.y,
  };
}

/**
 * Вычисляет новую позицию узла, сохраняя точку захвата.
 */
export function getNodePositionFromPointer(
  pointerScreen: Point,
  canvasRect: CanvasRect,
  viewport: CanvasViewport,
  grabOffset: Point,
): Point {
  const pointerCanvas = screenToCanvas(
    pointerScreen,
    canvasRect,
    viewport,
  );

  return {
    x: pointerCanvas.x - grabOffset.x,
    y: pointerCanvas.y - grabOffset.y,
  };
}
