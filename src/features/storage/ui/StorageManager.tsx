// src/features/storage/ui/StorageManager/StorageManager.tsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TodoStorage } from '@shared/api/storage/jsonStorage/todoStorage';
import { importNodes, clearAllNodes } from '@features/todo-nodes/model/slice';
import { loadProjectState } from '@features/project-management/model/slice';
import { RootState } from '@shared/lib/state/store';
import './StorageManager.css';

export const StorageManager: React.FC = () => {
  const dispatch = useDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Получаем состояние
  const nodes = useSelector((state: RootState) => state.todoNodes.nodes);
  const project = useSelector((state: RootState) => state.project);
  const nodeCount = Object.keys(nodes).length;
  const pageCount = Object.keys(project.pages).length;
  
  const [lastSave, setLastSave] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Загружаем время последнего сохранения
  useEffect(() => {
    const savedDate = TodoStorage.getLastSave();
    setLastSave(savedDate);
  }, []);

  // Функция для ручного сохранения всего
  const handleSave = useCallback(() => {
    setIsSaving(true);
    
    try {
      // Сохраняем задачи
      const successTodos = TodoStorage.saveTodos(nodes);
      
      // 🆕 Сохраняем проект
      const projectState = {
        currentProjectId: project.currentProjectId,
        projects: project.projects,
        pages: project.pages,
        canvases: project.canvases || {},
      };
      const successProject = TodoStorage.saveProjectState(projectState);
      
      if (successTodos || successProject) {
        setLastSave(new Date());
        alert('✅ Все данные сохранены');
      } else {
        alert('❌ Не удалось сохранить данные');
      }
    } catch (error) {
      alert('❌ Ошибка при сохранении');
    } finally {
      setTimeout(() => setIsSaving(false), 500);
    }
  }, [nodes, project]);

  // Автосохранение при размонтировании
  useEffect(() => {
    return () => {
      TodoStorage.saveTodos(nodes);
    };
  }, [nodes]);

  const handleExport = useCallback(() => {
    const exportData = {
      version: '1.1',
      exportDate: new Date().toISOString(),
      todoNodes: nodes,
      project: {
        currentProjectId: project.currentProjectId,
        projects: project.projects,
        pages: project.pages,
        canvases: project.canvases || {},
      },
    };
    
    TodoStorage.exportToFile(exportData);
  }, [nodes, project]);

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const importedData = await TodoStorage.importFromFile(file);
      
      // Импортируем задачи
      if (importedData.todoNodes) {
        dispatch(importNodes(importedData.todoNodes));
      }
      
      // 🆕 Импортируем проект
      if (importedData.project) {
        dispatch(loadProjectState(importedData.project));
      }
      
      // Сохраняем импортированные данные
      if (importedData.todoNodes) {
        TodoStorage.saveTodos(importedData.todoNodes);
      }
      if (importedData.project) {
        TodoStorage.saveProjectState(importedData.project);
      }
      
      setLastSave(new Date());
      
      const nodeCount = importedData.todoNodes ? Object.keys(importedData.todoNodes).length : 0;
      const projectCount = importedData.project ? 1 : 0;
      alert(`✅ Импортировано: ${nodeCount} задач, ${projectCount} проектов`);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      alert(`❌ Ошибка при импорте: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Вы уверены, что хотите удалить ВСЕ данные? Это действие нельзя отменить.')) {
      dispatch(clearAllNodes());
      TodoStorage.clearAll();
      setLastSave(null);
      alert('✅ Все данные удалены');
    }
  };

  // 🆕 Получаем информацию о проекте
  const projectInfo = TodoStorage.getProjectInfo();

  // Добавим автосохранение при изменении
  useEffect(() => {
    const timer = setTimeout(() => {
      if (nodeCount > 0 || pageCount > 0) {
        handleSave();
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [nodes, project, handleSave, nodeCount, pageCount]);

  return (
    <div className="storage-manager">
      <div className="storage-header">
        <h3>💾 Управление хранилищем</h3>
      </div>
      
      <div className="storage-stats">
        <div className="stat-item">
          <span className="stat-label">Задач:</span>
          <span className="stat-value">{nodeCount}</span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">Страниц:</span>
          <span className="stat-value">{pageCount}</span>
        </div>
        
        {projectInfo?.currentProject && (
          <div className="stat-item">
            <span className="stat-label">Проект:</span>
            <span className="stat-value">{projectInfo.currentProject.name}</span>
          </div>
        )}
        
        {lastSave && (
          <div className="stat-item">
            <span className="stat-label">Сохранено:</span>
            <span className="stat-value">
              {lastSave.toLocaleTimeString().slice(0, 5)}
            </span>
          </div>
        )}
      </div>

      <div className="storage-actions">
        <button 
          onClick={handleSave}
          className="storage-btn storage-btn-save"
          disabled={isSaving}
          title="Сохранить все данные в браузер"
        >
          {isSaving ? '💾 Сохранение...' : '💾 Сохранить все'}
        </button>
        
        <button 
          onClick={handleExport} 
          className="storage-btn storage-btn-export"
          title="Скачать все данные в JSON файл"
        >
          📤 Экспорт
        </button>
        
        <button 
          onClick={() => fileInputRef.current?.click()} 
          className="storage-btn storage-btn-import"
          title="Импортировать данные из JSON файла"
        >
          📥 Импорт
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
          title="Удалить все данные"
        >
          🗑️ Очистить
        </button>
      </div>
      
      <div className="storage-info">
        <small>
          <strong>Автосохранение работает:</strong>
          <ul>
            <li>✓ Автоматически каждые 3 секунды</li>
            <li>✓ Сохраняет задачи и проекты</li>
            <li>✓ При закрытии страницы</li>
            <li>✓ Данные хранятся в браузере</li>
          </ul>
        </small>
      </div>
    </div>
  );
};