import React, { useEffect, useRef } from 'react';
import type { TextNodeData } from '@entities/text-node/model/types';
import styles from './TextNode.module.css';
export const TextNode: React.FC<{ node: TextNodeData; selected: boolean; isDragging?: boolean; dragPosition?: { x: number; y: number }; onChange: (text: string) => void; onClick: (e: React.MouseEvent) => void; onDragStart: (event: React.PointerEvent, id: string, position: { x: number; y: number }) => void }> = ({ node, selected, isDragging, dragPosition, onChange, onClick, onDragStart }) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (selected && node.text === '') ref.current?.focus(); }, [selected, node.text]);
  return <textarea data-node-id={node.id} ref={ref} className={`${styles.node} ${selected ? styles.selected : ''}`} value={node.text} placeholder="Введите текст" onPointerDown={event => { if (event.button === 0) onDragStart(event, node.id, node.position); }} onClick={onClick} onChange={e => onChange(e.target.value)} style={{ left: dragPosition?.x ?? node.position.x, top: dragPosition?.y ?? node.position.y, width: node.size.width, height: node.size.height, fontSize: node.fontSize, color: node.color, zIndex: isDragging ? 1000 : node.zIndex }} />;
};
