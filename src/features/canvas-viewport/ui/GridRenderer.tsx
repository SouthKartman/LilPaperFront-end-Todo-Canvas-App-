import React, { useMemo } from 'react';
import { Layer, Line } from 'react-konva';

interface GridRendererProps {
  width: number;
  height: number;
  scale: number;
  position: { x: number; y: number };
  gridSize?: number;
  majorGridColor?: string;
  minorGridColor?: string;
}

export const GridRenderer: React.FC<GridRendererProps> = ({
  width,
  height,
  scale,
  position,
  gridSize = 20,
  majorGridColor = '#d1d5db',
  minorGridColor = '#e5e7eb',
}) => {
  const { majorLines, minorLines } = useMemo(() => {
    if (scale < 0.1) return { majorLines: [], minorLines: [] };
    
    const effectiveGridSize = gridSize * scale;
    
    // Определяем, какую сетку показывать в зависимости от масштаба
    let baseGridSize = effectiveGridSize;
    let showMinorGrid = true;
    
    if (scale < 0.3) {
      baseGridSize = effectiveGridSize * 10; // Очень крупная сетка
      showMinorGrid = false;
    } else if (scale < 0.8) {
      baseGridSize = effectiveGridSize * 5; // Крупная сетка
      showMinorGrid = scale > 0.5;
    }
    
    const majorLines: any[] = [];
    const minorLines: any[] = [];
    
    const startX = -position.x % baseGridSize;
    const startY = -position.y % baseGridSize;
    
    const countX = Math.ceil(width / baseGridSize) + 2;
    const countY = Math.ceil(height / baseGridSize) + 2;
    
    // Основная (крупная) сетка
    for (let i = -1; i < countX; i++) {
      const x = startX + i * baseGridSize;
      majorLines.push({
        key: `v-major-${i}`,
        points: [x, 0, x, height],
      });
    }
    
    for (let i = -1; i < countY; i++) {
      const y = startY + i * baseGridSize;
      majorLines.push({
        key: `h-major-${i}`,
        points: [0, y, width, y],
      });
    }
    
    // Мелкая сетка (если нужно)
    if (showMinorGrid && effectiveGridSize < baseGridSize) {
      const minorStartX = -position.x % effectiveGridSize;
      const minorStartY = -position.y % effectiveGridSize;
      const minorCountX = Math.ceil(width / effectiveGridSize) + 2;
      const minorCountY = Math.ceil(height / effectiveGridSize) + 2;
      
      for (let i = -1; i < minorCountX; i++) {
        const x = minorStartX + i * effectiveGridSize;
        // Пропускаем линии, которые совпадают с крупной сеткой
        if (Math.abs((x - startX) % baseGridSize) > 1) {
          minorLines.push({
            key: `v-minor-${i}`,
            points: [x, 0, x, height],
          });
        }
      }
      
      for (let i = -1; i < minorCountY; i++) {
        const y = minorStartY + i * effectiveGridSize;
        // Пропускаем линии, которые совпадают с крупной сеткой
        if (Math.abs((y - startY) % baseGridSize) > 1) {
          minorLines.push({
            key: `h-minor-${i}`,
            points: [0, y, width, y],
          });
        }
      }
    }
    
    return { majorLines, minorLines };
  }, [width, height, scale, position, gridSize]);

  if (scale < 0.1) return null;

  return (
    <Layer listening={false}>
      {/* Мелкая сетка */}
      {minorLines.map((line) => (
        <Line
          key={line.key}
          points={line.points}
          stroke={minorGridColor}
          strokeWidth={0.5 / scale}
          opacity={0.3}
          dash={[2, 3]}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
        />
      ))}
      
      {/* Крупная сетка */}
      {majorLines.map((line) => (
        <Line
          key={line.key}
          points={line.points}
          stroke={majorGridColor}
          strokeWidth={1 / scale}
          opacity={0.5}
          dash={scale < 0.5 ? undefined : [5, 5]}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
        />
      ))}
      
      {/* Оси координат (при определенном масштабе) */}
      {scale > 0.5 && (
        <>
          <Line
            points={[0, -position.y, width, -position.y]}
            stroke="#3b82f6"
            strokeWidth={1.5 / scale}
            opacity={0.7}
            dash={[10, 5]}
          />
          <Line
            points={[-position.x, 0, -position.x, height]}
            stroke="#3b82f6"
            strokeWidth={1.5 / scale}
            opacity={0.7}
            dash={[10, 5]}
          />
        </>
      )}
      
      {/* Центральная точка (оригин) */}
      <Line
        points={[
          -position.x - 5, -position.y,
          -position.x + 5, -position.y,
          -position.x, -position.y - 5,
          -position.x, -position.y + 5
        ]}
        stroke="#ef4444"
        strokeWidth={2 / scale}
        opacity={0.8}
        lineJoin="round"
        lineCap="round"
      />
    </Layer>
  );
};