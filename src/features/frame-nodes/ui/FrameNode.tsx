import React, { useCallback, useEffect, useRef, useState } from "react";
import type { FrameNode as FrameNodeData } from "@entities/frame/model/types";
import styles from "./FrameNode.module.css";

interface Props {
  node: FrameNodeData;
  isSelected: boolean;
  isDragging: boolean;
  dragPosition?: { x: number; y: number };
  scale: number;
  clipPath?: string;
  onClick: (event: React.MouseEvent, id: string) => void;
  onDragStart: (
    event: React.PointerEvent,
    id: string,
    position: { x: number; y: number },
  ) => void;
  onResize: (
    id: string,
    size: { width: number; height: number },
    position: { x: number; y: number },
  ) => void;
  onRename: (id: string, name: string) => void;
  onToggleClip: (id: string, clipContent: boolean) => void;
}

export const FrameNode: React.FC<Props> = ({
  node,
  isSelected,
  isDragging,
  dragPosition,
  scale,
  clipPath,
  onClick,
  onDragStart,
  onResize,
  onRename,
  onToggleClip,
}) => {
  const sizeAtStart = useRef(node.size);
  const pointerAtStart = useRef({ x: 0, y: 0 });
  const [isRenaming, setIsRenaming] = useState(false);
  const [name, setName] = useState(node.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setName(node.name), [node.name]);
  useEffect(() => { if (isRenaming) nameInputRef.current?.focus(); }, [isRenaming]);

  const finishRenaming = () => {
    const nextName = name.trim();
    if (nextName && nextName !== node.name) onRename(node.id, nextName);
    else setName(node.name);
    setIsRenaming(false);
  };
  const beginResize = useCallback(
    (edge: string) => (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      sizeAtStart.current = node.size;
      pointerAtStart.current = { x: event.clientX, y: event.clientY };
      const pointerId = event.pointerId;
      const resize = (move: PointerEvent) => {
        if (move.pointerId !== pointerId) return;
        const dx = (move.clientX - pointerAtStart.current.x) / scale;
        const dy = (move.clientY - pointerAtStart.current.y) / scale;
        const fromLeft = edge.includes("w");
        const fromTop = edge.includes("n");
        const width = Math.max(120, sizeAtStart.current.width + (fromLeft ? -dx : edge.includes("e") ? dx : 0));
        const height = Math.max(80, sizeAtStart.current.height + (fromTop ? -dy : edge.includes("s") ? dy : 0));
        onResize(node.id, { width, height }, {
          x: node.position.x + (fromLeft ? sizeAtStart.current.width - width : 0),
          y: node.position.y + (fromTop ? sizeAtStart.current.height - height : 0),
        });
      };
      const finish = (up: PointerEvent) => {
        if (up.pointerId !== pointerId) return;
        document.removeEventListener("pointermove", resize);
        document.removeEventListener("pointerup", finish);
        document.removeEventListener("pointercancel", finish);
      };
      document.addEventListener("pointermove", resize);
      document.addEventListener("pointerup", finish);
      document.addEventListener("pointercancel", finish);
    },
    [node.id, node.size, node.position, onResize, scale],
  );
  const position = dragPosition || node.position;
  return (
    <div
      data-node-id={node.id}
      className={`${styles.frame} ${isSelected ? styles.selected : ""} ${isDragging ? styles.dragging : ""}`}
      style={{
        left: position.x,
        top: position.y,
        width: node.size.width,
        height: node.size.height,
        zIndex: node.zIndex,
        background: node.fill,
        borderColor: node.stroke,
        borderWidth: node.strokeWidth,
        borderRadius: node.cornerRadius,
        clipPath,
      }}
      onClick={(event) => onClick(event, node.id)}
      onPointerDown={(event) => {
        if (event.button === 0) onDragStart(event, node.id, node.position);
      }}
    >
      <div className={styles.label} onPointerDown={event => event.stopPropagation()}>
        {isRenaming ? (
          <input ref={nameInputRef} className={styles.nameInput} value={name} onChange={event => setName(event.target.value)} onBlur={finishRenaming} onKeyDown={event => { if (event.key === "Enter") finishRenaming(); if (event.key === "Escape") { setName(node.name); setIsRenaming(false); } }} />
        ) : (
          <span onDoubleClick={() => setIsRenaming(true)} title="Двойной клик — переименовать">{node.name}</span>
        )}
        {isSelected && <button className={`${styles.clipToggle} ${node.clipContent ? styles.clipEnabled : ""}`} type="button" onClick={event => { event.stopPropagation(); onToggleClip(node.id, !node.clipContent); }} title="Clip content">Clip</button>}
      </div>
      {isSelected && ["n", "ne", "e", "se", "s", "sw", "w", "nw"].map(edge => (
        <div key={edge} className={`${styles.resizeHandle} ${styles[`handle${edge.toUpperCase()}`]}`} onPointerDown={beginResize(edge)} aria-label="Изменить размер Frame" />
      ))}
    </div>
  );
};
