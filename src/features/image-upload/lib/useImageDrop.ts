// features/image-upload/lib/useImageDrop.ts

import { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useImageUpload } from './useImageUpload'; // ✅ Правильный импорт
import { validateImage } from './imageProcessor';
import { selectCurrentProject } from '@features/project-management/model/selectors';

interface UseImageDropReturn {
  isDraggingOver: boolean;
  dropError: string | null;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent, position: { x: number; y: number }) => Promise<void>;
  clearError: () => void;
}

export const useImageDrop = (): UseImageDropReturn => {
  const dispatch = useDispatch();
  const currentProject = useSelector(selectCurrentProject);
  
  // 🆕 Получаем функции из хука
  const imageUpload = useImageUpload();
  // console.log('📦 useImageDrop: imageUpload =', imageUpload); // Для отладки
  
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);

  // Обработчик drag over
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingOver(true);
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  // Обработчик drag leave
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  }, []);

  // Обработчик drop
  const handleDrop = useCallback(async (e: React.DragEvent, position: { x: number; y: number }) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDraggingOver(false);
    setDropError(null);

    // console.log('📥 Drop событие:', { position });

    const files = Array.from(e.dataTransfer.files);
    
    if (files.length === 0) {
      console.warn('⚠️ Нет файлов в drop');
      return;
    }

    console.log('📁 Получены файлы:', files.map(f => ({ name: f.name, type: f.type, size: f.size })));

    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      setDropError('Можно загружать только изображения');
      return;
    }

    if (!currentProject) {
      setDropError('Нет текущего проекта');
      return;
    }

    try {
      // Валидируем каждый файл
      for (const file of imageFiles) {
        const validation = validateImage(file);
        if (!validation.valid) {
          setDropError(validation.error || 'Ошибка валидации');
          return;
        }
      }

      // 🆕 Проверяем, что uploadImages существует
      if (!imageUpload.uploadImages) {
        console.error('❌ uploadImages не найден в imageUpload:', imageUpload);
        setDropError('Ошибка инициализации загрузки');
        return;
      }

      console.log('🚀 Начинаем загрузку файлов...');
      
      // Загружаем изображения
      const result = await imageUpload.uploadImages(imageFiles, position);
      
      console.log('✅ Загрузка завершена:', result);
      
    } catch (error) {
      console.error('❌ Ошибка при загрузке изображений:', error);
      setDropError('Не удалось загрузить изображения');
    }
  }, [currentProject, imageUpload]); // 🆕 Добавляем imageUpload в зависимости

  const clearError = useCallback(() => {
    setDropError(null);
  }, []);

  return {
    isDraggingOver,
    dropError,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    clearError,
  };
};