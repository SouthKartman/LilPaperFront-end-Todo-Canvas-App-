import { useCallback, useEffect, useRef, useState } from "react";

import {
  getGrabOffset,
  getNodePositionFromPointer,
  screenToCanvas,
  type Point,
} from "@features/canvas-viewport/lib/canvasCoordinates";

export type CanvasNodeType = "todo" | "image" | "plugin" | "frame" | "text" | "rectangle";

export interface CanvasDragSession {
  nodeId: string;
  nodeType: CanvasNodeType;
  initialPosition: Point;
  currentPosition: Point;
  grabOffset: Point;
  pointerScreen: Point;
  pointerId: number;
  groupNodes: CanvasDragGroupNode[];
}

interface Viewport {
  position: Point;
  scale: number;
}

export interface StartCanvasDragOptions {
  nodeId: string;
  nodeType: CanvasNodeType;
  nodePosition: Point;
  clientX: number;
  clientY: number;
  pointerId: number;
}

export interface CanvasDragGroupNode {
  nodeId: string;
  nodeType: CanvasNodeType;
  initialPosition: Point;
}

interface UseCanvasDragSessionOptions {
  canvasRef: React.RefObject<HTMLElement | null>;
  viewport: Viewport;
  onCommit: (result: Pick<CanvasDragSession, "nodeId" | "nodeType"> & { position: Point }) => void;
}

const canvasRect = (canvas: HTMLElement) => {
  const { left, top } = canvas.getBoundingClientRect();
  return { left, top };
};

export function useCanvasDragSession({ canvasRef, viewport, onCommit }: UseCanvasDragSessionOptions) {
  const [drag, setDrag] = useState<CanvasDragSession | null>(null);
  const dragRef = useRef<CanvasDragSession | null>(null);
  const viewportRef = useRef(viewport);
  const commitRef = useRef(onCommit);
  const rafRef = useRef<number | null>(null);


  useEffect(() => {
    viewportRef.current = viewport;
    commitRef.current = onCommit;
  }, [viewport, onCommit]);

  const positionFor = useCallback((session: CanvasDragSession) => {
    const canvas = canvasRef.current;
    return canvas
      ? getNodePositionFromPointer(session.pointerScreen, canvasRect(canvas), viewportRef.current, session.grabOffset)
      : session.currentPosition;
  }, [canvasRef]);

  const cancelRaf = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);
  const publish = useCallback(() => {
    rafRef.current = null;
    const session = dragRef.current;
    if (!session) return;
    const next = { ...session, currentPosition: positionFor(session) };
    dragRef.current = next;
    setDrag(next);
  }, [positionFor]);
  const schedule = useCallback(() => {
    if (rafRef.current === null) rafRef.current = requestAnimationFrame(publish);
  }, [publish]);
  const cancelDrag = useCallback(() => {
    dragRef.current = null;
    setDrag(null);
    cancelRaf();
  }, [cancelRaf]);

  const startDrag = useCallback((options: StartCanvasDragOptions) => {
    const canvas = canvasRef.current;
    if (dragRef.current || !canvas) return;
    const initialPosition = { ...options.nodePosition };
    const pointerScreen = { x: options.clientX, y: options.clientY };
    const pointerCanvas = screenToCanvas(pointerScreen, canvasRect(canvas), viewportRef.current);
    const groupNodes: CanvasDragGroupNode[] = options.groupNodes
      ? options.groupNodes.map((node) => ({
        nodeId: node.nodeId,
        nodeType: node.nodeType,
        initialPosition: { ...node.nodePosition },
      }))
      : [
        {
          nodeId: options.nodeId,
          nodeType: options.nodeType,
          initialPosition: { ...initialPosition },
        },
      ];

    // На случай, если вызывающий код не включил основную ноду в группу.
    if (
      !groupNodes.some(
        (node) =>
          node.nodeId === options.nodeId &&
          node.nodeType === options.nodeType,
      )
    ) {
      groupNodes.unshift({
        nodeId: options.nodeId,
        nodeType: options.nodeType,
        initialPosition: { ...initialPosition },
      });
    }

    const session: CanvasDragSession = {
      nodeId: options.nodeId,
      nodeType: options.nodeType,
      initialPosition,
      currentPosition: initialPosition,
      grabOffset: getGrabOffset(pointerCanvas, initialPosition),
      pointerScreen,
      pointerId: options.pointerId,
      groupNodes,
    };
    dragRef.current = session;
    setDrag(session);
  }, [canvasRef]);

  useEffect(() => {
    if (!drag) return;
    const move = (event: PointerEvent) => {
      const session = dragRef.current;
      if (!session || session.pointerId !== event.pointerId) return;
      dragRef.current = { ...session, pointerScreen: { x: event.clientX, y: event.clientY } };
      schedule();
    };
    const finish = (event: PointerEvent) => {
      const session = dragRef.current;

      if (!session || session.pointerId !== event.pointerId) return;

      const position = positionFor({
        ...session,
        pointerScreen: {
          x: event.clientX,
          y: event.clientY,
        },
      });

      const delta = {
        x: position.x - session.initialPosition.x,
        y: position.y - session.initialPosition.y,
      };

      // Сохраняем позиции всех нод с одинаковым смещением.
      const nodesToCommit = session.groupNodes.map((node) => ({
        nodeId: node.nodeId,
        nodeType: node.nodeType,
        position: {
          x: node.initialPosition.x + delta.x,
          y: node.initialPosition.y + delta.y,
        },
      }));

      cancelDrag();

      for (const node of nodesToCommit) {
        commitRef.current(node);
      }
    };
    const abort = (event: PointerEvent) => {
      if (dragRef.current?.pointerId === event.pointerId) cancelDrag();
    };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") cancelDrag(); };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", finish);
    document.addEventListener("pointercancel", abort);
    document.addEventListener("keydown", escape);
    window.addEventListener("blur", cancelDrag);
    return () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", finish);
      document.removeEventListener("pointercancel", abort);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("blur", cancelDrag);
    };
  }, [drag, cancelDrag, positionFor, schedule]);

  useEffect(() => { if (dragRef.current) schedule(); }, [viewport.position.x, viewport.position.y, viewport.scale, schedule]);
  useEffect(() => cancelRaf, [cancelRaf]);

  return { drag, startDrag, cancelDrag };
}
