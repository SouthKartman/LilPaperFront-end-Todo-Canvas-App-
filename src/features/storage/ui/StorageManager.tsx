// src/features/storage/ui/StorageManager/StorageManager.tsx
import React, { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TodoStorage } from '@shared/api/storage/jsonStorage/todoStorage';
import { importNodes, exportNodes, clearAllNodes } from '../../todo-nodes/model/slice';
// import { RootState } from '@app/providers/StoreProvider/config/store';
import { RootState } from '@shared/lib/state/store';
import './StorageManager.css';

export const StorageManager: React.FC = () => {
  const dispatch = useDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Получаем количество нод для отображения статистики
  const nodeCount = useSelector((state: RootState) => 
    Object.keys(state.todoNodes.nodes).length
  );
  
  const lastSave = TodoStorage.getLastSave();

  const handleExport = () => {
    dispatch(exportNodes());
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const importedNodes = await TodoStorage.importFromFile(file);
      dispatch(importNodes(importedNodes));
      alert(`Импортировано ${Object.keys(importedNodes).length} задач`);
      
      // Очищаем input для возможности повторного импорта того же файла
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      alert(`Ошибка при импорте: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Вы уверены, что хотите удалить ВСЕ задачи? Это действие нельзя отменить.')) {
      dispatch(clearAllNodes());
      alert('Все задачи удалены');
    }
  };

  const handleBackup = () => {
    const nodes = useSelector((state: RootState) => state.todoNodes.nodes);
    TodoStorage.exportToFile(nodes);
  };

  return (
    <div className="storage-manager">
      <div className="storage-stats">
        <div className="stat-item">
          <span className="stat-label">Задач в хранилище:</span>
          <span className="stat-value">{nodeCount}</span>
        </div>
        
        {lastSave && (
          <div className="stat-item">
            <span className="stat-label">Последнее сохранение:</span>
            <span className="stat-value">
              {lastSave.toLocaleDateString()} {lastSave.toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>

      <div className="storage-actions">
        <button 
          onClick={handleExport} 
          className="storage-btn storage-btn-export"
          title="Скачать все задачи в JSON файл"
        >
          📤 Экспорт JSON
        </button>
        
        <button 
          onClick={() => fileInputRef.current?.click()} 
          className="storage-btn storage-btn-import"
          title="Импортировать задачи из JSON файла"
        >
          📥 Импорт JSON
        </button>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImport}
          accept=".json,application/json"
          style={{ display: 'none' }}
        />
        
        <button 
          onClick={handleBackup} 
          className="storage-btn storage-btn-backup"
          title="Создать резервную копию"
        >
          💾 Создать бэкап
        </button>
        
        <button 
          onClick={handleClearAll} 
          className="storage-btn storage-btn-clear"
          title="Удалить все задачи"
        >
          🗑️ Очистить всё
        </button>
      </div>
      
      <div className="storage-info">
        <small>
          Данные автоматически сохраняются в браузере при каждом изменении.
          Экспортируйте бэкапы для переноса между устройствами.
        </small>
      </div>
    </div>
  );
};