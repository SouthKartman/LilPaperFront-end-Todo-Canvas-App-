// src/features/storage/ui/StorageManager/StorageManager.tsx
import React, { useRef, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TodoStorage } from '@shared/api/storage/jsonStorage/todoStorage';
import { importNodes, exportNodes, clearAllNodes } from '../../todo-nodes/model/slice';
import { RootState } from '@shared/lib/state/store';
import './StorageManager.css';

export const StorageManager: React.FC = () => {
  const dispatch = useDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  
  // Получаем количество нод из Redux
  const nodeCount = useSelector((state: RootState) => 
    Object.keys(state.todoNodes.nodes).length
  );
  
  // Состояние для времени последнего сохранения
  // Получаем данные один раз в начале компонента
  const nodes = useSelector((state: RootState) => state.todoNodes.nodes);
  const [lastSave, setLastSave] = useState<Date | null>(null);

  // Загружаем время последнего сохранения при монтировании
  useEffect(() => {
    const savedDate = TodoStorage.getLastSave();
    setLastSave(savedDate);
  }, []);

  const handleExport = () => {
    // ✅ Теперь nodes уже получен через хук выше
    TodoStorage.exportToFile(nodes);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const importedNodes = await TodoStorage.importFromFile(file);
      dispatch(importNodes(importedNodes));
      alert(`✅ Импортировано ${Object.keys(importedNodes).length} задач`);
      
      // Обновляем время последнего сохранения
      setLastSave(new Date());
      
      // Очищаем input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      alert(`❌ Ошибка при импорте: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Вы уверены, что хотите удалить ВСЕ задачи? Это действие нельзя отменить.')) {
      dispatch(clearAllNodes());
      setLastSave(null);
      alert('✅ Все задачи удалены');
    }
  };

  const handleBackup = () => {
    const nodes = useSelector((state: RootState) => state.todoNodes.nodes);
    TodoStorage.exportToFile(nodes);
  };

  const handleRefreshStats = () => {
    const savedDate = TodoStorage.getLastSave();
    setLastSave(savedDate);
  };

  return (
    <div className="storage-manager">
      <div className="storage-header">
        <h3>💾 Управление хранилищем</h3>
        <button 
          onClick={handleRefreshStats}
          className="storage-btn storage-btn-refresh"
          title="Обновить статистику"
        >
          🔄
        </button>
      </div>
      
      <div className="storage-stats">
        <div className="stat-item">
          <span className="stat-label">Задач в памяти:</span>
          <span className="stat-value">{nodeCount}</span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">Сохранено в браузере:</span>
          <span className="stat-value">{TodoStorage.getSavedCount()}</span>
        </div>
        
        {lastSave && (
          <div className="stat-item">
            <span className="stat-label">Последнее сохранение:</span>
            <span className="stat-value">
              {lastSave.toLocaleDateString()} {lastSave.toLocaleTimeString().slice(0, 5)}
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
          📤 Экспорт в JSON
        </button>
        
        <button 
          onClick={() => fileInputRef.current?.click()} 
          className="storage-btn storage-btn-import"
          title="Импортировать задачи из JSON файла"
        >
          📥 Импорт из JSON
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
          <strong>Как работает автосохранение:</strong>
          <ul>
            <li>✓ Данные сохраняются в браузере при каждом изменении</li>
            <li>✓ Сохраняются между сессиями и перезагрузками</li>
            <li>✓ Экспортируйте бэкапы для переноса на другое устройство</li>
            <li>✓ Импортируйте JSON файлы для восстановления данных</li>
          </ul>
        </small>
      </div>
    </div>
  );
};