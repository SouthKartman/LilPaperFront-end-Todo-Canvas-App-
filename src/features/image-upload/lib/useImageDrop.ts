import { useCallback, useState } from 'react';
import { useAppDispatch } from '@shared/lib/state';
import { addImageNode, setError, setLoading } from '../model/slice';
import { processMultipleImages } from './imageProcessor';
import { ImageNode } from '@entities/image/model/types';

interface UseImageDropProps {
  enabled?: boolean;
  onImageDrop?: (images: ImageNode[]) => void;
}

export const useImageDrop = ({ enabled = true, onImageDrop }: UseImageDropProps = {}) => {
  const dispatch = useAppDispatch();
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!enabled) return;
    
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
    setDropError(null);
  }, [enabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!enabled) return;
    
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  }, [enabled]);

  const handleDrop = useCallback(async (
    e: React.DragEvent, 
    canvasPosition: { x: number; y: number }
  ) => {
    if (!enabled) return;
    
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    setDropError(null);
    
    const files = Array.from(e.dataTransfer.files);
    
    if (files.length === 0) {
      setDropError('Перетащите файлы');
      return;
    }

    try {
      dispatch(setLoading(true));
      
      // Обрабатываем изображения
      const processedImages = await processMultipleImages(files);
      
      if (processedImages.length === 0) {
        setDropError('Нет валидных изображений');
        return;
      }
      
      // Создаем ноды с учетом позиции
      const imageNodes: ImageNode[] = processedImages.map((img, index) => ({
        ...img,
        type: 'image',
        position: {
          x: canvasPosition.x + index * 30,
          y: canvasPosition.y + index * 30,
        },
        size: { width: img.width, height: img.height },
        zIndex: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      
      // Добавляем в store
      imageNodes.forEach(node => {
        dispatch(addImageNode(node));
      });
      
      // Вызываем колбэк
      onImageDrop?.(imageNodes);
      
      dispatch(setLoading(false));
    } catch (error) {
      console.error('Error processing images:', error);
      setDropError(error instanceof Error ? error.message : 'Ошибка обработки изображений');
      dispatch(setError(error instanceof Error ? error.message : 'Ошибка обработки изображений'));
      dispatch(setLoading(false));
    }
  }, [enabled, dispatch, onImageDrop]);

  return {
    isDraggingOver,
    dropError,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    clearError: () => setDropError(null),
  };
};