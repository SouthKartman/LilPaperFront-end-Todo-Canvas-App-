// src/shared/ui/kit/AppInitializer/AppInitializer.tsx

import React from 'react';
import { useIndexedDBInit } from '@features/storage/lib/useIndexedDBInit';
import './AppInitializer.css';

interface AppInitializerProps {
  children: React.ReactNode;
}

export const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
  const { isInitialized, isMigrating, progress } = useIndexedDBInit();

  if (!isInitialized) {
    const progressPercent = progress ? (progress.progress / progress.total) * 100 : 0;
    
    const stageNames = {
      todos: 'Задачи',
      images: 'Изображения',
      project: 'Проект',
      complete: 'Завершение'
    };

    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <div className="loading-text">
            {isMigrating ? '🔄 Миграция данных...' : '📂 Загрузка...'}
          </div>
          
          {isMigrating && progress && (
            <div className="migration-progress">
              <div className="progress-stage">
                {stageNames[progress.stage] || 'Подготовка'}
              </div>
              
              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              
              <div className="progress-percent">
                {Math.round(progressPercent)}%
              </div>
              
              {progress.currentItem && (
                <div className="progress-item">
                  {progress.currentItem}
                </div>
              )}
            </div>
          )}
          
          {isMigrating && (
            <div className="loading-hint">
              Пожалуйста, подождите. Перенос данных в новое хранилище...
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};