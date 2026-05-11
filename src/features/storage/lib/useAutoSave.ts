// src/features/storage/lib/useAutoSave.ts
import { useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@shared/lib/state/store';
import { TodoStorage } from '@shared/api/storage/jsonStorage/todoStorage';
import { ImageStorage } from '@shared/api/storage/jsonStorage/imageStorage'; // 🆕 Импортируем

export const useAutoSave = () => {
  const todoNodes = useSelector((state: RootState) => state.todoNodes.nodes);
  const imageNodes = useSelector((state: RootState) => state.imageNodes.nodes); // 🆕 Получаем изображения
  
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const prevTodoRef = useRef<string>('');
  const prevImageRef = useRef<string>(''); // 🆕 Для изображений

  // Функция для сохранения всего
  const save = useCallback(() => {
    // Сохраняем задачи
    if (Object.keys(todoNodes).length > 0) {
      const todoString = JSON.stringify(todoNodes);
      if (todoString !== prevTodoRef.current) {
        console.log('💾 Автосохранение задач...');
        TodoStorage.saveTodos(todoNodes);
        prevTodoRef.current = todoString;
      }
    }
    
    // 🆕 Сохраняем изображения
    if (Object.keys(imageNodes).length > 0) {
      const imageString = JSON.stringify(imageNodes);
      if (imageString !== prevImageRef.current) {
        console.log('🖼️ Автосохранение изображений...');
        ImageStorage.saveImages(imageNodes);
        prevImageRef.current = imageString;
      }
    }
  }, [todoNodes, imageNodes]);

  // Автосохранение при изменениях
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      save();
    }, 3000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [todoNodes, imageNodes, save]);

  // Сохранение при закрытии страницы
  useEffect(() => {
    const handleBeforeUnload = () => {
      save();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [save]);

  return { save };
};