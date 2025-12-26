// src/features/storage/ui/StorageManager/StorageManager.tsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TodoStorage } from '@shared/api/storage/jsonStorage/todoStorage';
import { importNodes, clearAllNodes } from '../../todo-nodes/model/slice';
import { RootState } from '@shared/lib/state/store';
import './StorageManager.css';

export const StorageManager: React.FC = () => {
  const dispatch = useDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Получаем состояние один раз в хуке
  const nodes = useSelector((state: RootState) => state.todoNodes.nodes);
  const nodeCount = Object.keys(nodes).length;
  
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

  // Автосохранение при размонтировании
  useEffect(() => {
    return () => {
      // Сохраняем при закрытии/обновлении страницы
      TodoStorage.saveTodos(nodes);
    };
  }, [nodes]);

  const handleExport = useCallback(() => {
    TodoStorage.exportToFile(nodes);
  }, [nodes]);

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const importedNodes = await TodoStorage.importFromFile(file);
      dispatch(importNodes(importedNodes));
      
      // Автосохранение после импорта
      TodoStorage.saveTodos(importedNodes);
      setLastSave(new Date());
      
      alert(`✅ Импортировано ${Object.keys(importedNodes).length} задач`);
      
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
      TodoStorage.clearAll();
      setLastSave(null);
      alert('✅ Все задачи удалены');
    }
  };

  const handleRefreshStats = () => {
    const savedDate = TodoStorage.getLastSave();
    setLastSave(savedDate);
  };

  // Добавим автосохранение при изменении nodes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (nodeCount > 0) {
        handleSave();
      }
    }, 3000); // Автосохранение каждые 3 секунды при изменениях

    return () => clearTimeout(timer);
  }, [nodes, handleSave, nodeCount]);

  return (
    <div className="storage-manager">
      <div className="storage-header">
        <h3>💾 Управление хранилищем</h3>
        <div className="storage-status">
          {/* {isSaving ? (
            <span className="saving-indicator">💾 Сохранение...</span>
          ) : lastSave ? (
            <span className="last-save">
              ✓ Сохранено: {lastSave.toLocaleTimeString().slice(0, 5)}
            </span>
          ) : null} */}
          <button 
            onClick={handleRefreshStats}
            className="storage-btn storage-btn-refresh"
            title="Обновить статистику"
          >
            🔄
          </button>
        </div>
      </div>
      
      <div className="storage-stats">
        <div className="stat-item">
          <span className="stat-label">Задач в памяти:</span>
          <span className="stat-value">{nodeCount}</span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">Сохранено в браузере:</span>
          <span className="stat-value">{TodoStorage.getStats().nodeCount}</span>
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
          onClick={handleSave}
          className="storage-btn storage-btn-save"
          disabled={isSaving}
          title="Сохранить в браузер"
        >
          {isSaving ? '💾 Сохранение...' : '💾 Сохранить сейчас'}
        </button>
        
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
          onClick={handleClearAll} 
          className="storage-btn storage-btn-clear"
          title="Удалить все задачи"
        >
          🗑️ Очистить всё
        </button>
      </div>
      
      <div className="storage-info">
        <small>
          <strong>Автосохранение работает:</strong>
          <ul>
            <li>✓ Автоматически каждые 3 секунды при изменениях</li>
            <li>✓ При закрытии страницы</li>
            <li>✓ При любом изменении задач</li>
            <li>✓ Данные хранятся только в вашем браузере</li>
          </ul>
        </small>
      </div>
    </div>
  );
};