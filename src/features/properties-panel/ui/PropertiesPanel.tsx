// src/features/properties-panel/ui/PropertiesPanel.tsx
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ColorPicker } from '@shared/ui/kit/ColorPicker/ColorPicker';
import { selectAllFrames, selectSelectedFrameIds, updateFrame } from '@features/frame-nodes/model/slice';
import { selectAllTexts, selectSelectedTextIds, updateText } from '@features/text-nodes/model/slice';
import { selectAllRectangles, selectSelectedRectangleIds, updateRectangle } from '@features/rectangle-nodes/model/slice';
import styles from './PropertiesPanel.module.css';

export const PropertiesPanel: React.FC = () => {
  const dispatch = useDispatch(); const frames = useSelector(selectAllFrames); const texts = useSelector(selectAllTexts); const rectangles = useSelector(selectAllRectangles);
  const frameIds = useSelector(selectSelectedFrameIds); const textIds = useSelector(selectSelectedTextIds); const rectangleIds = useSelector(selectSelectedRectangleIds);
  const item = frameIds[0] ? { kind: 'frame' as const, node: frames.find(n => n.id === frameIds[0]) } : textIds[0] ? { kind: 'text' as const, node: texts.find(n => n.id === textIds[0]) } : rectangleIds[0] ? { kind: 'rectangle' as const, node: rectangles.find(n => n.id === rectangleIds[0]) } : null;
  if (!item?.node) return <div className={styles.panel}><h3 className={styles.title}>Свойства</h3><p className={styles.empty}>Выделите Frame, текст или прямоугольник.</p></div>;
  const { node, kind } = item; const color = kind === 'text' ? node.color : node.fill;
  const updatePosition = (axis: 'x' | 'y', value: string) => { const position = { ...node.position, [axis]: Number(value) || 0 }; if (kind === 'frame') dispatch(updateFrame({ id: node.id, updates: { position } })); if (kind === 'text') dispatch(updateText({ id: node.id, updates: { position } })); if (kind === 'rectangle') dispatch(updateRectangle({ id: node.id, updates: { position } })); };
  const updateColor = (value: string) => { if (kind === 'frame') dispatch(updateFrame({ id: node.id, updates: { fill: value } })); if (kind === 'text') dispatch(updateText({ id: node.id, updates: { color: value } })); if (kind === 'rectangle') dispatch(updateRectangle({ id: node.id, updates: { fill: value } })); };
  return <div className={styles.panel}><h3 className={styles.title}>{kind === 'frame' ? 'Frame' : kind === 'text' ? 'Текст' : 'Прямоугольник'}</h3><div className={styles.content}><p className={styles.coordinateCaption}>{node.parentFrameId ? 'Координаты внутри Frame' : 'Координаты на холсте'}</p><div className={styles.coordinates}><label>X<input type="number" value={node.position.x} onChange={e => updatePosition('x', e.target.value)} /></label><label>Y<input type="number" value={node.position.y} onChange={e => updatePosition('y', e.target.value)} /></label></div><h4>{kind === 'text' ? 'Цвет текста' : 'Заливка'}</h4><ColorPicker value={color} onChange={updateColor} /></div></div>;
};
