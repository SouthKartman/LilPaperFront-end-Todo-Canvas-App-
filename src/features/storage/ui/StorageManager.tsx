import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TodoStorage } from '@shared/api/storage/jsonStorage/todoStorage';
import { ImageStorage } from '@shared/api/storage/jsonStorage/imageStorage';
import { TodoIndexedDBStorage } from '@shared/api/storage/indexedDB/todoStorage';
import { ImageIndexedDBStorage } from '@shared/api/storage/indexedDB/imageStorage';
import { ProjectIndexedDBStorage } from '@shared/api/storage/indexedDB/projectStorage';
import { importNodes, clearAllNodes } from '@features/todo-nodes/model/slice';
import { clearAllImages } from '@features/image-upload/model/slice';
import { loadProjectState } from '@features/project-management/model/slice';
import { RootState } from '@shared/lib/state/store';
import { db } from '@shared/api/storage/indexedDB/schema';
import './StorageManager.css';

interface StorageStats {
  localStorage: {
    todos: number;
    images: number;
    project: boolean;
    lastSave: Date | null;
    imageSize: number;
  };
  indexedDB: {
    todos: number;
    images: number;
    projects: number;
    pages: number;
    canvases: number;
    imageSize: number;
    dbSize?: string;
  };
}

interface StorageManagerProps {
  modalMode?: boolean;
}

export const StorageManager: React.FC<StorageManagerProps> = ({ modalMode = false }) => {
  const dispatch = useDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Получаем состояние из Redux
  const todoNodes = useSelector((state: RootState) => state.todoNodes.nodes);
  const imageNodes = useSelector((state: RootState) => state.imageNodes.nodes);
  const project = useSelector((state: RootState) => state.project);
  
  const todoCount = Object.keys(todoNodes).length;
  const imageCount = Object.keys(imageNodes).length;
  const pageCount = Object.keys(project.pages || {}).length;
  
  const [stats, setStats] = useState<StorageStats>({
    localStorage: {
      todos: 0,
      images: 0,
      project: false,
      lastSave: null,
      imageSize: 0,
    },
    indexedDB: {
      todos: 0,
      images: 0,
      projects: 0,
      pages: 0,
      canvases: 0,
      imageSize: 0,
    },
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeStorage, setActiveStorage] = useState<'localStorage' | 'indexedDB' | 'both'>('both');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Загружаем статистику из обоих хранилищ
  const loadStats = useCallback(async () => {
    setIsRefreshing(true);
    
    try {
      // Статистика из localStorage
      const localTodos = TodoStorage.loadTodos();
      const localImages = ImageStorage.loadImages();
      const localProject = localStorage.getItem('project_state');
      const localLastSave = TodoStorage.getLastSave();
      const localImageStats = ImageStorage.getStats();
      
      // Статистика из IndexedDB
      const [idbTodos, idbImages, idbProjects, idbPages, idbCanvases] = await Promise.all([
        db.todos.count(),
        db.images.count(),
        db.projects.count(),
        db.pages.count(),
        db.canvases.count(),
      ]);
      
      // Размер изображений в IndexedDB
      const idbImagesList = await db.images.toArray();
      const idbImageSize = idbImagesList.reduce((acc, img) => acc + (img.fileSize || 0), 0);
      
      // Оценка размера базы данных
      let dbSize = 'N/A';
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        if (estimate.usage) {
          const usageMB = estimate.usage / (1024 * 1024);
          dbSize = `${usageMB.toFixed(2)} MB`;
        }
      }
      
      setStats({
        localStorage: {
          todos: Object.keys(localTodos).length,
          images: Object.keys(localImages).length,
          project: !!localProject,
          lastSave: localLastSave,
          imageSize: localImageStats.totalSize || 0,
        },
        indexedDB: {
          todos: idbTodos,
          images: idbImages,
          projects: idbProjects,
          pages: idbPages,
          canvases: idbCanvases,
          imageSize: idbImageSize,
          dbSize,
        },
      });

      // Определяем активное хранилище
      if (idbTodos > 0 || idbImages > 0) {
        setActiveStorage(idbTodos > 0 ? 'indexedDB' : 'both');
      } else if (Object.keys(localTodos).length > 0) {
        setActiveStorage('localStorage');
      }
      
    } catch (error) {
      console.error('❌ Ошибка загрузки статистики:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Загружаем статистику при монтировании
  useEffect(() => {
    loadStats();
    
    // Обновляем статистику каждые 5 секунд
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, [loadStats]);

  // Функция для экспорта данных в JSON файл
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    
    try {
      // Собираем все данные для экспорта
      const exportData = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        stats: {
          todoCount,
          imageCount,
          pageCount,
          projectName: project.projects[project.currentProjectId || '']?.name || 'Без названия',
        },
        data: {
          todoNodes: todoNodes,
          imageNodes: imageNodes,
          project: {
            currentProjectId: project.currentProjectId,
            projects: project.projects || {},
            pages: project.pages || {},
            canvases: project.canvases || {},
          },
        },
        storage: {
          localStorage: stats.localStorage,
          indexedDB: stats.indexedDB,
        },
      };

      // Создаем и скачиваем файл
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Формируем имя файла с датой и именем проекта
      const projectName = project.projects[project.currentProjectId || '']?.name || 'project';
      const dateStr = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      a.download = `todo-backup-${projectName}-${dateStr}.json`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      console.log(`📤 Экспортировано: ${todoCount} задач, ${imageCount} изображений`);
      alert(`✅ Экспорт завершен! Файл: ${a.download}`);
    } catch (error) {
      console.error('❌ Ошибка экспорта:', error);
      alert('❌ Ошибка при экспорте данных');
    } finally {
      setIsExporting(false);
    }
  }, [todoNodes, imageNodes, project, todoCount, imageCount, pageCount, stats]);

  // Функция для ручного сохранения в оба хранилища
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    
    try {
      // Сохраняем в localStorage
      const successTodos = TodoStorage.saveTodos(todoNodes);
      const successImages = ImageStorage.saveImages(imageNodes);
      
      const projectState = {
        currentProjectId: project.currentProjectId,
        projects: project.projects || {},
        pages: project.pages || {},
        canvases: project.canvases || {},
      };
      const successProject = TodoStorage.saveProjectState(projectState);
      
      // Сохраняем в IndexedDB
      await TodoIndexedDBStorage.saveTodos(todoNodes);
      await ImageIndexedDBStorage.saveImages(imageNodes);
      await ProjectIndexedDBStorage.saveProject(projectState);
      
      // Обновляем статистику
      await loadStats();
      
      const savedCount = 
        (successTodos ? Object.keys(todoNodes).length : 0) +
        (successImages ? Object.keys(imageNodes).length : 0);
      
      alert(`✅ Сохранено в оба хранилища: ${savedCount} элементов`);
    } catch (error) {
      console.error('❌ Ошибка сохранения:', error);
      alert('❌ Ошибка при сохранении');
    } finally {
      setIsSaving(false);
    }
  }, [todoNodes, imageNodes, project, loadStats]);

  // Функция для миграции из localStorage в IndexedDB
  const handleMigrate = useCallback(async () => {
    if (!window.confirm('Перенести данные из localStorage в IndexedDB? Старые данные останутся как резервная копия.')) {
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Загружаем из localStorage
      const localTodos = TodoStorage.loadTodos();
      const localImages = ImageStorage.loadImages();
      const localProjectStr = localStorage.getItem('project_state');
      const localProject = localProjectStr ? JSON.parse(localProjectStr) : null;
      
      // Сохраняем в IndexedDB
      if (Object.keys(localTodos).length > 0) {
        await TodoIndexedDBStorage.saveTodos(localTodos);
      }
      
      if (Object.keys(localImages).length > 0) {
        await ImageIndexedDBStorage.saveImages(localImages);
      }
      
      if (localProject) {
        await ProjectIndexedDBStorage.saveProject(localProject);
      }
      
      await loadStats();
      alert(`✅ Миграция завершена! Перенесено: ${Object.keys(localTodos).length} задач, ${Object.keys(localImages).length} изображений`);
    } catch (error) {
      console.error('❌ Ошибка миграции:', error);
      alert('❌ Ошибка при миграции');
    } finally {
      setIsSaving(false);
    }
  }, [loadStats]);

  // Функция для очистки IndexedDB
  const handleClearIndexedDB = useCallback(async () => {
    if (!window.confirm('Очистить IndexedDB? Это действие нельзя отменить.')) {
      return;
    }
    
    try {
      await Promise.all([
        db.todos.clear(),
        db.images.clear(),
        db.projects.clear(),
        db.pages.clear(),
        db.canvases.clear(),
      ]);
      
      await loadStats();
      alert('✅ IndexedDB очищена');
    } catch (error) {
      console.error('❌ Ошибка очистки IndexedDB:', error);
      alert('❌ Ошибка при очистке');
    }
  }, [loadStats]);

  // Форматируем размер файлов
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Форматируем дату
  const formatDate = (date: Date | null) => {
    if (!date) return 'Никогда';
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className={modalMode ? 'storage-manager-modal' : 'storage-manager'}>
      <div className="storage-header">
        <h3>💾 Управление хранилищем</h3>
        <button 
          onClick={loadStats} 
          className="storage-btn storage-btn-refresh"
          disabled={isRefreshing}
          title="Обновить статистику"
        >
          {isRefreshing ? '🔄' : '↻'}
        </button>
      </div>
      
      <div className="storage-comparison">
        {/* localStorage секция */}
        <div className={`storage-section ${activeStorage === 'localStorage' ? 'active' : ''}`}>
          <div className="storage-section-header">
            <h4>📦 localStorage</h4>
            <span className="storage-badge">Старое хранилище</span>
          </div>
          
          <div className="storage-stats">
            <div className="stat-item">
              <span className="stat-label">📝 Задачи:</span>
              <span className="stat-value">{stats.localStorage.todos}</span>
            </div>
            
            <div className="stat-item">
              <span className="stat-label">🖼️ Изображения:</span>
              <span className="stat-value">{stats.localStorage.images}</span>
            </div>
            
            {stats.localStorage.imageSize > 0 && (
              <div className="stat-item">
                <span className="stat-label">📦 Объем:</span>
                <span className="stat-value">{formatFileSize(stats.localStorage.imageSize)}</span>
              </div>
            )}
            
            <div className="stat-item">
              <span className="stat-label">📁 Проект:</span>
              <span className="stat-value">{stats.localStorage.project ? '✅' : '❌'}</span>
            </div>
            
            <div className="stat-item">
              <span className="stat-label">⏱️ Последнее:</span>
              <span className="stat-value">{formatDate(stats.localStorage.lastSave)}</span>
            </div>
          </div>
        </div>

        {/* IndexedDB секция */}
        <div className={`storage-section ${activeStorage === 'indexedDB' ? 'active' : ''}`}>
          <div className="storage-section-header">
            <h4>🗄️ IndexedDB</h4>
            <span className="storage-badge storage-badge-new">Новое хранилище</span>
          </div>
          
          <div className="storage-stats">
            <div className="stat-item">
              <span className="stat-label">📝 Задачи:</span>
              <span className="stat-value">{stats.indexedDB.todos}</span>
            </div>
            
            <div className="stat-item">
              <span className="stat-label">🖼️ Изображения:</span>
              <span className="stat-value">{stats.indexedDB.images}</span>
            </div>
            
            {stats.indexedDB.imageSize > 0 && (
              <div className="stat-item">
                <span className="stat-label">📦 Объем:</span>
                <span className="stat-value">{formatFileSize(stats.indexedDB.imageSize)}</span>
              </div>
            )}
            
            <div className="stat-item">
              <span className="stat-label">📁 Проектов:</span>
              <span className="stat-value">{stats.indexedDB.projects}</span>
            </div>
            
            <div className="stat-item">
              <span className="stat-label">📄 Страниц:</span>
              <span className="stat-value">{stats.indexedDB.pages}</span>
            </div>
            
            <div className="stat-item">
              <span className="stat-label">🖼️ Полотен:</span>
              <span className="stat-value">{stats.indexedDB.canvases}</span>
            </div>
            
            {stats.indexedDB.dbSize && (
              <div className="stat-item">
                <span className="stat-label">💿 Размер БД:</span>
                <span className="stat-value">{stats.indexedDB.dbSize}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Redux состояние */}
      <div className="redux-stats">
        <h4>🔄 Текущее состояние (Redux)</h4>
        <div className="storage-stats">
          <div className="stat-item">
            <span className="stat-label">📝 Задач в памяти:</span>
            <span className="stat-value">{todoCount}</span>
          </div>
          
          <div className="stat-item">
            <span className="stat-label">🖼️ Изображений в памяти:</span>
            <span className="stat-value">{imageCount}</span>
          </div>
          
          <div className="stat-item">
            <span className="stat-label">📄 Страниц в памяти:</span>
            <span className="stat-value">{pageCount}</span>
          </div>
        </div>
      </div>

      <div className="storage-actions">
        <button 
          onClick={handleSave}
          className="storage-btn storage-btn-save"
          disabled={isSaving}
          title="Сохранить в оба хранилища"
        >
          {isSaving ? '💾 Сохранение...' : '💾 Сохранить все'}
        </button>
        
        <button 
          onClick={handleExport}
          className="storage-btn storage-btn-export"
          disabled={isExporting || (todoCount === 0 && imageCount === 0)}
          title="Экспортировать данные в JSON файл"
        >
          {isExporting ? '📤 Экспорт...' : '📤 Экспорт JSON'}
        </button>
        
        <button 
          onClick={handleMigrate} 
          className="storage-btn storage-btn-migrate"
          disabled={isSaving || stats.indexedDB.todos > 0}
          title="Перенести данные из localStorage в IndexedDB"
        >
          🚀 Миграция
        </button>
        
        <button 
          onClick={handleClearIndexedDB} 
          className="storage-btn storage-btn-clear-idb"
          title="Очистить IndexedDB"
        >
          🗑️ Очистить IDB
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
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;

            try {
              const text = await file.text();
              const data = JSON.parse(text);
              
              if (data.data?.todoNodes) {
                dispatch(importNodes(data.data.todoNodes));
              } else if (data.todoNodes) {
                dispatch(importNodes(data.todoNodes));
              }
              
              if (data.data?.imageNodes) {
                dispatch({ type: 'imageNodes/importImages', payload: data.data.imageNodes });
              } else if (data.imageNodes) {
                dispatch({ type: 'imageNodes/importImages', payload: data.imageNodes });
              }
              
              if (data.data?.project) {
                dispatch(loadProjectState(data.data.project));
              } else if (data.project) {
                dispatch(loadProjectState(data.project));
              }
              
              await loadStats();
              alert('✅ Импорт завершен');
            } catch (error) {
              console.error('❌ Ошибка импорта:', error);
              alert('❌ Ошибка импорта');
            }
            
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }}
          accept=".json,application/json"
          style={{ display: 'none' }}
        />
        
        <button 
          onClick={() => {
            if (window.confirm('Удалить все данные из Redux и localStorage?')) {
              dispatch(clearAllNodes());
              dispatch(clearAllImages());
              TodoStorage.clearAll();
              ImageStorage.clearAll();
              loadStats();
            }
          }} 
          className="storage-btn storage-btn-clear"
          title="Удалить все данные из localStorage и Redux"
        >
          🧹 Очистить LS
        </button>
      </div>
      
      <div className="storage-info">
        <small>
          <strong>Статус миграции:</strong>{' '}
          {stats.indexedDB.todos > 0 ? (
            <span style={{ color: '#28a745' }}>✅ Данные в IndexedDB</span>
          ) : stats.localStorage.todos > 0 ? (
            <span style={{ color: '#ffc107' }}>⚠️ Данные только в localStorage</span>
          ) : (
            <span style={{ color: '#6c757d' }}>⏸️ Нет данных</span>
          )}
        </small>
        <br />
        <small>
          <strong>Активное хранилище:</strong>{' '}
          {activeStorage === 'indexedDB' ? '🗄️ IndexedDB' : 
           activeStorage === 'localStorage' ? '📦 localStorage' : 
           '🔄 Оба хранилища'}
        </small>
        <br />
        <small>
          <strong>Последний экспорт:</strong>{' '}
          {isExporting ? '⏳ Экспортируется...' : 'Готов к экспорту'}
        </small>
      </div>
    </div>
  );
};