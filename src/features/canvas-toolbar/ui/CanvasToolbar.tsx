// src/features/canvas-toolbar/ui/CanvasToolbar.tsx
import React, { useCallback, useEffect, useState } from 'react'
import styles from './CanvasToolbar.module.css'
import { RootState } from '@shared/lib/state/store'
import { StorageManager } from '@features/storage/ui/StorageManager';
import { TodoStorage } from '@shared/api/storage/jsonStorage/todoStorage';
import { useSelector } from 'react-redux';
import { useAppModal } from '@shared/ui/kit/Modal/AppModal';
import ZoomControls from '@features/canvas-viewport/ui/ZoomControls';

export const CanvasToolbar: React.FC = () => {
  // Получаем состояние один раз в хуке
  const nodes = useSelector((state: RootState) => state.todoNodes.nodes);
  
  const [lastSave, setLastSave] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Загружаем время последнего сохранения
  useEffect(() => {
    const savedDate = TodoStorage.getLastSave();
    setLastSave(savedDate);
  }, []);
  
  // Функция для ручного сохранения
  const handleSave = useCallback(() => {
    setIsSaving(true);
    const success = TodoStorage.saveTodos(nodes);
    
    if (success) {
      setLastSave(new Date());
      setTimeout(() => setIsSaving(false), 500);
    } else {
      setIsSaving(false);
      alert('❌ Не удалось сохранить данные');
    }
  }, [nodes]);

  // ✅ Правильно деструктурируем объект из хука
  const { openModal } = useAppModal();
  
  const handleOpenStorageManager = () => {
    openModal(
      <StorageManager />,
      {
        // title: 'Управление сохранениями',
        width: '750px',
        height: '500px',
        onClose: () => {
          console.log('Storage manager закрыт');
        }
      }
    );
  };

  return (
    <div className={styles.toolbar}>
      <div className={styles.tools}>
        
      </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <span style={{ fontSize: '14px', color: '#666' }}>Масштаб:</span>
        <ZoomControls />
        <button 
          onClick={handleSave}
          className="storage-btn storage-btn-save"
          disabled={isSaving}
          title="Сохранить в браузер">
          {isSaving ? '💾 Сохранение...' : '💾 Сохранить сейчас'}
        </button>
        <button 
          onClick={handleOpenStorageManager}
          className='storage-btn'
          >
          📁 Хранилище
        </button>
      </div>
    </div>
  );
};