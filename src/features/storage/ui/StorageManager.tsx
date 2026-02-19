// src/features/storage/ui/StorageManager/StorageManager.tsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TodoStorage } from '@shared/api/storage/jsonStorage/todoStorage';
import { ImageStorage } from '@shared/api/storage/jsonStorage/imageStorage'; // 🆕 Импортируем
import { importNodes, clearAllNodes } from '@features/todo-nodes/model/slice';
import { clearAllImages } from '@features/image-upload/model/slice'; // 🆕 Импортируем
import { loadProjectState } from '@features/project-management/model/slice';
import { RootState } from '@shared/lib/state/store';
import './StorageManager.css';

export const StorageManager: React.FC = () => {
  const dispatch = useDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Получаем состояние
  const todoNodes = useSelector((state: RootState) => state.todoNodes.nodes);
  const imageNodes = useSelector((state: RootState) => state.imageNodes.nodes); // 🆕
  const project = useSelector((state: RootState) => state.project);
  
  const todoCount = Object.keys(todoNodes).length;
  const imageCount = Object.keys(imageNodes).length; // 🆕
  const pageCount = Object.keys(project.pages).length;
  
  const [lastSave, setLastSave] = useState<Date | null>(null);
  const [imageStats, setImageStats] = useState({ count: 0, totalSize: 0 }); // 🆕
  const [isSaving, setIsSaving] = useState(false);

  // Загружаем время последнего сохранения
  useEffect(() => {
    const savedDate = TodoStorage.getLastSave();
    setLastSave(savedDate);
    
    // 🆕 Загружаем статистику изображений
    const stats = ImageStorage.getStats();
    setImageStats(stats);
  }, []);

  // Функция для ручного сохранения всего
  const handleSave = useCallback(() => {
    setIsSaving(true);
    
    try {
      // Сохраняем задачи
      const successTodos = TodoStorage.saveTodos(todoNodes);
      
      // 🆕 Сохраняем изображения
      const successImages = ImageStorage.saveImages(imageNodes);
      
      // Сохраняем проект
      const projectState = {
        currentProjectId: project.currentProjectId,
        projects: project.projects,
        pages: project.pages,
        canvases: project.canvases || {},
      };
      const successProject = TodoStorage.saveProjectState(projectState);
      
      if (successTodos || successProject || successImages) {
        setLastSave(new Date());
        
        // 🆕 Обновляем статистику изображений
        setImageStats(ImageStorage.getStats());
        
        alert(`✅ Сохранено: ${todoCount} задач, ${imageCount} изображений`);
      } else {
        alert('❌ Не удалось сохранить данные');
      }
    } catch (error) {
      alert('❌ Ошибка при сохранении');
    } finally {
      setTimeout(() => setIsSaving(false), 500);
    }
  }, [todoNodes, imageNodes, project, todoCount, imageCount]);

  // Автосохранение при размонтировании
  useEffect(() => {
    return () => {
      TodoStorage.saveTodos(todoNodes);
      ImageStorage.saveImages(imageNodes); // 🆕
    };
  }, [todoNodes, imageNodes]);

  const handleExport = useCallback(() => {
    const exportData = {
      version: '1.1',
      exportDate: new Date().toISOString(),
      todoNodes: todoNodes,
      imageNodes: imageNodes, // 🆕 Добавляем изображения
      project: {
        currentProjectId: project.currentProjectId,
        projects: project.projects,
        pages: project.pages,
        canvases: project.canvases || {},
      },
    };
    
    // 🆕 Обновляем экспорт
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `todo-project-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    console.log(`📤 Экспорт: ${todoCount} задач, ${imageCount} изображений`);
  }, [todoNodes, imageNodes, project, todoCount, imageCount]);

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const importedData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            resolve(JSON.parse(e.target?.result as string));
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsText(file);
      }) as any;
      
      // Импортируем задачи
      if (importedData.todoNodes) {
        dispatch(importNodes(importedData.todoNodes));
        TodoStorage.saveTodos(importedData.todoNodes);
      }
      
      // 🆕 Импортируем изображения
      if (importedData.imageNodes) {
        dispatch({ type: 'imageNodes/importImages', payload: importedData.imageNodes });
        ImageStorage.saveImages(importedData.imageNodes);
      }
      
      // Импортируем проект
      if (importedData.project) {
        dispatch(loadProjectState(importedData.project));
        TodoStorage.saveProjectState(importedData.project);
      }
      
      setLastSave(new Date());
      setImageStats(ImageStorage.getStats());
      
      const importedTodoCount = importedData.todoNodes ? Object.keys(importedData.todoNodes).length : 0;
      const importedImageCount = importedData.imageNodes ? Object.keys(importedData.imageNodes).length : 0; // 🆕
      
      alert(`✅ Импортировано: ${importedTodoCount} задач, ${importedImageCount} изображений`);
      
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
      dispatch(clearAllImages()); // 🆕 Очищаем изображения
      TodoStorage.clearAll();
      ImageStorage.clearAll(); // 🆕
      setLastSave(null);
      setImageStats({ count: 0, totalSize: 0 });
      alert('✅ Все данные удалены');
    }
  };

  const projectInfo = TodoStorage.getProjectInfo();

  // Форматируем размер файлов
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Автосохранение при изменении
  useEffect(() => {
    const timer = setTimeout(() => {
      if (todoCount > 0 || imageCount > 0 || pageCount > 0) {
        handleSave();
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [todoNodes, imageNodes, project, handleSave, todoCount, imageCount, pageCount]);

  return (
    <div className="storage-manager">
      <div className="storage-header">
        <h3>💾 Управление хранилищем</h3>
      </div>
      
      <div className="storage-stats">
        <div className="stat-item">
          <span className="stat-label">📝 Задач:</span>
          <span className="stat-value">{todoCount}</span>
        </div>
        
        {/* 🆕 Статистика изображений */}
        <div className="stat-item">
          <span className="stat-label">🖼️ Изображений:</span>
          <span className="stat-value">{imageCount}</span>
        </div>
        
        {imageStats.totalSize > 0 && (
          <div className="stat-item">
            <span className="stat-label">📦 Объем:</span>
            <span className="stat-value">{formatFileSize(imageStats.totalSize)}</span>
          </div>
        )}
        
        <div className="stat-item">
          <span className="stat-label">📄 Страниц:</span>
          <span className="stat-value">{pageCount}</span>
        </div>
        
        {projectInfo?.currentProject && (
          <div className="stat-item">
            <span className="stat-label">📁 Проект:</span>
            <span className="stat-value">{projectInfo.currentProject.name}</span>
          </div>
        )}
        
        {lastSave && (
          <div className="stat-item">
            <span className="stat-label">⏱️ Сохранено:</span>
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
            <li>✓ Сохраняет задачи, изображения и проекты</li>
            <li>✓ При закрытии страницы</li>
            <li>✓ Данные хранятся в браузере</li>
          </ul>
        </small>
      </div>
    </div>
  );
};