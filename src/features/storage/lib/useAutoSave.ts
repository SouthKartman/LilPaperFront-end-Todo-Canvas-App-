// src/features/storage/lib/useAutoSave.ts
import { useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@shared/lib/state/store';
import { TodoStorage } from '@shared/api/storage/jsonStorage/todoStorage';

export const useAutoSave = () => {
  const nodes = useSelector((state: RootState) => state.todoNodes.nodes);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const prevNodesRef = useRef<string>('');

  // Функция для сохранения
  const save = useCallback(() => {
    if (Object.keys(nodes).length === 0) return;
    
    const nodesString = JSON.stringify(nodes);
    if (nodesString === prevNodesRef.current) return;
    
    console.log('💾 Автосохранение...');
    TodoStorage.saveTodos(nodes);
    prevNodesRef.current = nodesString;
  }, [nodes]);

  // Автосохранение при изменениях
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      save();
    }, 3000); // Задержка 3 секунды

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [nodes, save]);

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