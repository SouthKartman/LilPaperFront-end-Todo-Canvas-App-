// src/features/storage/lib/useIndexedDBInit.ts
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { db } from '@shared/api/storage/indexedDB/schema';
import { TodoIndexedDBStorage } from '@shared/api/storage/indexedDB/todoStorage';
import { ImageIndexedDBStorage } from '@shared/api/storage/indexedDB/imageStorage';
import { importNodes } from '@features/todo-nodes/model/slice';
import { importImages } from '@features/image-upload/model/slice';
import { loadProjectState } from '@features/project-management/model/slice';
import { migrationService, MigrationProgress } from './migrationUtils';
import { ProjectIndexedDBStorage } from '@shared/api/storage/indexedDB/projectStorage';

export const useIndexedDBInit = () => {
  const dispatch = useDispatch();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress>({
    stage: 'todos',
    progress: 0,
    total: 1,
  });

  useEffect(() => {
    if (!dispatch) {
      console.error('❌ Redux dispatch не доступен');
      setIsInitialized(true);
      return;
    }

    // Подписываемся на прогресс миграции
    migrationService.onProgress((newProgress) => {
      setProgress(newProgress);
    });


    
    const initialize = async () => {
      try {
        // Открываем соединение с БД
        await db.open();
        console.log('📂 IndexedDB соединение открыто');
        
        // Проверяем состояние данных
        const dataStatus = await migrationService.checkData();
        
        // Если есть данные в localStorage и нет в IndexedDB - мигрируем
        if (dataStatus.hasLocalStorageData && !dataStatus.hasIndexedDBData) {
          console.log('🔄 Обнаружены данные в localStorage, начинаем миграцию...');
          setIsMigrating(true);
          
          const success = await migrationService.migrateFromLocalStorage();
          
          if (!success) {
            console.warn('⚠️ Миграция не удалась, загружаем из localStorage');
            await loadFromLocalStorage();
          }
          
          setIsMigrating(false);
        }
        
        // Загружаем данные из IndexedDB в Redux
        await loadDataToRedux();
        
        setIsInitialized(true);
        console.log('✅ IndexedDB инициализирован');
      } catch (error) {
        console.error('❌ Ошибка инициализации IndexedDB:', error);
        // В случае ошибки загружаем из localStorage
        await loadFromLocalStorage();
        setIsInitialized(true);
      }
    };

    initialize();
  }, [dispatch]);

  const loadDataToRedux = async (): Promise<void> => {
    try {
      // Загружаем задачи
      const todos = await TodoIndexedDBStorage.loadTodos();
      if (Object.keys(todos).length > 0 && dispatch) {
        dispatch(importNodes(todos));
        console.log(`📂 Загружено ${Object.keys(todos).length} задач в Redux`);
      }

      // Загружаем изображения
      const images = await ImageIndexedDBStorage.loadImages();
      if (Object.keys(images).length > 0 && dispatch) {
        dispatch(importImages(images));
        console.log(`📂 Загружено ${Object.keys(images).length} изображений в Redux`);
      }

      // Загружаем проект
      const project = await migrationService.checkData();
      // Здесь нужно добавить загрузку проекта в Redux
      
    } catch (error) {
      console.error('❌ Ошибка загрузки данных в Redux:', error);
    }
  };

  const loadFromLocalStorage = async (): Promise<void> => {
    console.log('⚠️ Использую localStorage как fallback');
    try {
      // Загружаем из localStorage напрямую
      const { TodoStorage } = await import('@shared/api/storage/jsonStorage/todoStorage');
      const { ImageStorage } = await import('@shared/api/storage/jsonStorage/imageStorage');
      
      const todos = TodoStorage.loadTodos();
      const images = ImageStorage.loadImages();
      
      if (Object.keys(todos).length > 0 && dispatch) {
        dispatch(importNodes(todos));
      }
      
      if (Object.keys(images).length > 0 && dispatch) {
        dispatch(importImages(images));
      }
      
      // Загружаем проект из localStorage
      const projectStr = localStorage.getItem('project_state');
      if (projectStr && dispatch) {
        const project = JSON.parse(projectStr);
        dispatch(loadProjectState(project));
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки из localStorage:', error);
    }
  };

  return { 
    isInitialized, 
    isMigrating,
    progress 
  };
};