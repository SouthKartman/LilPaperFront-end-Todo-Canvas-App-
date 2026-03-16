// src/features/canvas-preview/lib/generatePreview.ts
import { RootState } from '@shared/lib/state/store';
import { store } from '@shared/lib/state/store';

interface PreviewNode {
  type: 'todo' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}

export const generatePreview = async (projectId: string): Promise<string> => {
  // Получаем состояние из Redux
  const state = store.getState();
  const project = state.project.projects[projectId];
  
  if (!project) {
    throw new Error('Project not found');
  }

  // Собираем все ноды проекта
  const nodes: PreviewNode[] = [];
  
  project.pageIds.forEach(pageId => {
    const page = state.project.pages[pageId];
    if (page?.canvasId) {
      const canvas = state.project.canvases[page.canvasId];
      
      // Получаем todo ноды
      if (canvas?.nodes) {
        canvas.nodes.forEach(nodeId => {
          // Здесь нужно получить ноду из соответствующего slice
          // Это пример, нужно адаптировать под вашу структуру
          const todoNode = (state as any).todoNodes?.entities?.[nodeId];
          if (todoNode) {
            nodes.push({
              type: 'todo',
              x: todoNode.position?.x || 0,
              y: todoNode.position?.y || 0,
              width: todoNode.size?.width || 200,
              height: todoNode.size?.height || 150,
              color: '#4361ee'
            });
          }
          
          const imageNode = (state as any).imageNodes?.entities?.[nodeId];
          if (imageNode) {
            nodes.push({
              type: 'image',
              x: imageNode.position?.x || 0,
              y: imageNode.position?.y || 0,
              width: imageNode.size?.width || 200,
              height: imageNode.size?.height || 200,
              color: '#f72585'
            });
          }
        });
      }
    }
  });

  // Генерируем SVG или Canvas представление
  return generatePreviewFromNodes(nodes);
};

const generatePreviewFromNodes = (nodes: PreviewNode[]): string => {
  // Создаем canvas элемент
  const canvas = document.createElement('canvas');
  canvas.width = 280;
  canvas.height = 140;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';

  // Очищаем и рисуем фон
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(0, 0, 280, 140);

  // Рисуем сетку
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 0.5;
  
  for (let i = 0; i < 14; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 20, 0);
    ctx.lineTo(i * 20, 140);
    ctx.strokeStyle = '#e0e0e0';
    ctx.stroke();
  }
  
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * 20);
    ctx.lineTo(280, i * 20);
    ctx.strokeStyle = '#e0e0e0';
    ctx.stroke();
  }

  // Рисуем узлы (уменьшенные в 5 раз)
  nodes.forEach(node => {
    const x = node.x / 5;
    const y = node.y / 5;
    const width = node.width / 5;
    const height = node.height / 5;

    // Проверяем, что элемент в пределах видимости
    if (x > 280 || y > 140 || x + width < 0 || y + height < 0) return;

    ctx.fillStyle = node.color || (node.type === 'todo' ? '#4361ee' : '#f72585');
    ctx.globalAlpha = 0.7;
    ctx.fillRect(x, y, width, height);
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
  });

  // Возвращаем data URL
  return canvas.toDataURL('image/png');
};

// Альтернативный вариант: генерация SVG
export const generateSVGPreview = (nodes: PreviewNode[]): string => {
  const width = 280;
  const height = 140;
  
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
  
  // Фон
  svg += `<rect width="${width}" height="${height}" fill="#f5f5f5"/>`;
  
  // Сетка
  svg += `<g stroke="#e0e0e0" stroke-width="0.5">`;
  for (let i = 0; i <= width; i += 20) {
    svg += `<line x1="${i}" y1="0" x2="${i}" y2="${height}"/>`;
  }
  for (let i = 0; i <= height; i += 20) {
    svg += `<line x1="0" y1="${i}" x2="${width}" y2="${i}"/>`;
  }
  svg += `</g>`;
  
  // Ноды
  nodes.forEach(node => {
    const x = node.x / 5;
    const y = node.y / 5;
    const w = node.width / 5;
    const h = node.height / 5;
    
    if (x <= width && y <= height && x + w >= 0 && y + h >= 0) {
      svg += `<rect 
        x="${x}" 
        y="${y}" 
        width="${w}" 
        height="${h}" 
        fill="${node.color || (node.type === 'todo' ? '#4361ee' : '#f72585')}" 
        opacity="0.7"
        stroke="#ffffff"
        stroke-width="1"
      />`;
    }
  });
  
  svg += `</svg>`;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};