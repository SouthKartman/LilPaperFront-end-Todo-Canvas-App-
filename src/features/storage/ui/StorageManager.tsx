// features/storage/ui/StorageManager/StorageManager.tsx
import React, { useCallback, useState, useRef, useEffect } from 'react';
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
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
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
  onClose?: () => void;
  onImportComplete?: () => void; // Добавляем колбэк для уведомления об успешном импорте
}

export const StorageManager: React.FC<StorageManagerProps> = ({ 
  modalMode = false,
  onClose,
  onImportComplete 
}) => {
  const dispatch = useDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Получаем состояние из Redux
  const todoNodes = useSelector((state: RootState) => state.todoNodes.nodes);
  const imageNodes = useSelector((state: RootState) => state.imageNodes.nodes);
  const project = useSelector((state: RootState) => state.project);
  
  const todoCount = Object.keys(todoNodes).length;
  const imageCount = Object.keys(imageNodes).length;
  const pageCount = Object.keys(project.pages || {}).length;
  const currentProject = project.projects[project.currentProjectId || ''];
  
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
  const [isImporting, setIsImporting] = useState(false);
  const [activeStorage, setActiveStorage] = useState<'localStorage' | 'indexedDB' | 'both'>('both');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  // Загружаем статистику из обоих хранилищ
  const loadStats = useCallback(async () => {
    setIsRefreshing(true);
    
    try {
      const localTodos = TodoStorage.loadTodos();
      const localImages = ImageStorage.loadImages();
      const localProject = localStorage.getItem('project_state');
      const localLastSave = TodoStorage.getLastSave();
      const localImageStats = ImageStorage.getStats();
      
      const [idbTodos, idbImages, idbProjects, idbPages, idbCanvases] = await Promise.all([
        db.todos.count(),
        db.images.count(),
        db.projects.count(),
        db.pages.count(),
        db.canvases.count(),
      ]);
      
      const idbFiles = await db.fileStorage.toArray();
      const idbImageSize = idbFiles.reduce((acc, file) => acc + (file.size || 0), 0);
      
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

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, [loadStats]);

  // Экспорт проекта
  const handleExport = useCallback(async () => {
    if (!currentProject) {
      alert('Нет активного проекта');
      return;
    }
    
    if (!imageCount && !todoCount) {
      alert('Нет данных для экспорта');
      return;
    }
    
    setIsExporting(true);
    setProgress(0);
    setProgressMessage('Подготовка данных...');
    
    try {
      const zip = new JSZip();
      
      setProgressMessage('Сбор метаданных...');
      setProgress(10);
      
      const exportData = {
        version: '3.0',
        exportDate: new Date().toISOString(),
        project: {
          id: currentProject.id,
          name: currentProject.name,
          exportedAt: Date.now(),
        },
        stats: {
          todoCount,
          imageCount,
          pageCount,
          totalSize: 0,
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
      };
      
      setProgressMessage('Получение изображений...');
      setProgress(20);
      
      const allFiles = await db.fileStorage.toArray();
      const imageFiles = allFiles.filter(file => file.mimeType?.startsWith('image/'));
      
      const imagesFolder = zip.folder('images');
      let processedFiles = 0;
      let totalSize = 0;
      
      for (const file of imageFiles) {
        try {
          const safeFileName = `${file.projectId}_${file.fileName}`;
          imagesFolder?.file(safeFileName, file.blob);
          
          totalSize += file.size;
          processedFiles++;
          
          const percent = 20 + (processedFiles / imageFiles.length) * 60;
          setProgress(Math.round(percent));
          setProgressMessage(`Добавление изображений: ${processedFiles}/${imageFiles.length}`);
          
          if (processedFiles % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        } catch (err) {
          console.error(`Ошибка добавления ${file.fileName}:`, err);
        }
      }
      
      exportData.stats.totalSize = totalSize;
      
      setProgressMessage('Создание манифеста...');
      setProgress(85);
      zip.file('project.json', JSON.stringify(exportData, null, 2));
      
      setProgressMessage('Создание архива...');
      setProgress(90);
      
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });
      
      setProgressMessage('Сохранение файла...');
      setProgress(95);
      
      const fileName = `${currentProject.name}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.canvas`;
      saveAs(zipBlob, fileName);
      
      setProgress(100);
      setProgressMessage(`✅ Экспорт завершен! Файлов: ${processedFiles}, Размер: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
      
      setTimeout(() => {
        setProgress(0);
        setProgressMessage('');
      }, 3000);
      
      alert(`✅ Проект "${currentProject.name}" успешно экспортирован!\n\n📦 Формат: .canvas (ZIP архив)\n🖼️ Изображений: ${processedFiles}\n💾 Размер: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
      
    } catch (error) {
      console.error('❌ Ошибка экспорта:', error);
      alert('❌ Ошибка при экспорте проекта');
      setProgress(0);
      setProgressMessage('');
    } finally {
      setIsExporting(false);
    }
  }, [currentProject, todoNodes, imageNodes, project, todoCount, imageCount, pageCount]);

  // Импорт проекта (исправленная версия без navigate)
  const handleImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.canvas') && !file.name.endsWith('.json')) {
      alert('Пожалуйста, выберите файл проекта (.canvas или .json)');
      event.target.value = '';
      return;
    }
    
    setIsImporting(true);
    setProgress(0);
    setProgressMessage('Чтение файла...');
    
    try {
      let projectData: any;
      
      if (file.name.endsWith('.canvas')) {
        const zip = await JSZip.loadAsync(file);
        const manifestFile = zip.file('project.json');
        if (!manifestFile) {
          throw new Error('project.json не найден в архиве');
        }
        const manifestContent = await manifestFile.async('string');
        projectData = JSON.parse(manifestContent);
      } else {
        const text = await file.text();
        projectData = JSON.parse(text);
      }
      
      setProgress(10);
      setProgressMessage('Файл загружен');
      
      // Получаем данные из правильного места
      const todoNodesData = projectData.data?.todoNodes || projectData.todoNodes || {};
      const imageNodesData = projectData.data?.imageNodes || projectData.imageNodes || {};
      const projectStateData = projectData.data?.project || projectData.project || {};
      
      // Создаем новый проект с уникальным ID
      const newProjectId = `proj_${Date.now()}`;
      const projectName = projectStateData.projects?.[projectStateData.currentProjectId]?.name || 
                          projectData.stats?.projectName || 
                          'Импортированный проект';
      const newProjectName = `${projectName}_${new Date().toISOString().slice(0, 10)}`;
      
      setProgress(15);
      setProgressMessage(`Создание проекта: ${newProjectName}`);
      
      const now = new Date().toISOString();
      
      // Создаем карты соответствия ID
      const todoIdMap = new Map<string, string>();
      const imageIdMap = new Map<string, string>();
      const pageIdMap = new Map<string, string>();
      
      // 1. Создаем новые страницы
      setProgress(20);
      setProgressMessage('Создание страниц...');
      
      const newPages: Record<string, any> = {};
      const oldPages = projectStateData.pages || {};
      let pageIndex = 0;
      
      for (const [oldPageId, page] of Object.entries(oldPages)) {
        const newPageId = `${newProjectId}_page_${Date.now()}_${pageIndex}`;
        pageIdMap.set(oldPageId, newPageId);
        
        newPages[newPageId] = {
          id: newPageId,
          name: (page as any).name || `Страница ${pageIndex + 1}`,
          projectId: newProjectId,
          canvasId: `${newProjectId}_canvas_${Date.now()}_${pageIndex}`,
          metadata: {
            createdAt: now,
            updatedAt: now,
            order: pageIndex,
          },
        };
        pageIndex++;
      }
      
      // 2. Создаем новые канвасы
      setProgress(30);
      setProgressMessage('Создание канвасов...');
      
      const newCanvases: Record<string, any> = {};
      const oldCanvases = projectStateData.canvases || {};
      const oldCanvasesList = Object.values(oldCanvases);
      
      for (let i = 0; i < pageIndex; i++) {
        const newPageId = Object.keys(newPages)[i];
        const canvasId = `${newProjectId}_canvas_${Date.now()}_${i}`;
        const oldCanvas = oldCanvasesList[i] as any;
        
        newCanvases[canvasId] = {
          id: canvasId,
          pageId: newPageId,
          nodes: oldCanvas?.nodes || [],
          viewport: oldCanvas?.viewport || { x: 0, y: 0, zoom: 1 },
          background: oldCanvas?.background || '#f0f0f0',
          grid: oldCanvas?.grid || { size: 20, color: '#e0e0e0', isVisible: true },
          metadata: {
            createdAt: now,
            updatedAt: now,
          },
        };
        
        // Обновляем canvasId в странице
        newPages[newPageId].canvasId = canvasId;
      }
      
      // 3. Создаем новые todoNodes
      setProgress(50);
      setProgressMessage('Создание задач...');
      
      const newTodoNodes: Record<string, any> = {};
      const todoEntries = Object.entries(todoNodesData);
      
      for (let i = 0; i < todoEntries.length; i++) {
        const [oldId, todo] = todoEntries[i];
        const newId = `${newProjectId}_todo_${Date.now()}_${i}`;
        todoIdMap.set(oldId, newId);
        
        const oldPageId = (todo as any).pageId;
        const newPageId = pageIdMap.get(oldPageId) || Object.keys(newPages)[0];
        
        newTodoNodes[newId] = {
          id: newId,
          title: (todo as any).title || 'Новая задача',
          description: (todo as any).description || '',
          status: (todo as any).status || 'todo',
          priority: (todo as any).priority || 'medium',
          createdAt: now,
          updatedAt: now,
          tags: (todo as any).tags || [],
          position: (todo as any).position || { x: 100 + i * 50, y: 100 + i * 50 },
          size: (todo as any).size || { width: 280, height: 150 },
          pageId: newPageId,
          projectId: newProjectId,
        };
      }
      
      // 4. Создаем новые imageNodes
      setProgress(65);
      setProgressMessage('Создание изображений...');
      
      const newImageNodes: Record<string, any> = {};
      const imageEntries = Object.entries(imageNodesData);
      
      for (let i = 0; i < imageEntries.length; i++) {
        const [oldId, image] = imageEntries[i];
        const newId = `${newProjectId}_img_${Date.now()}_${i}`;
        imageIdMap.set(oldId, newId);
        
        const oldPageId = (image as any).pageId;
        const newPageId = pageIdMap.get(oldPageId) || Object.keys(newPages)[0];
        
        newImageNodes[newId] = {
          id: newId,
          type: 'image',
          position: (image as any).position || { x: 100, y: 100 },
          size: (image as any).size || { width: 300, height: 200 },
          zIndex: (image as any).zIndex || 1000,
          filePath: (image as any).filePath || '',
          originalName: (image as any).originalName || 'image.jpg',
          fileSize: (image as any).fileSize || 0,
          mimeType: (image as any).mimeType || 'image/jpeg',
          createdAt: now,
          updatedAt: now,
          pageId: newPageId,
          projectId: newProjectId,
        };
      }
      
      // 5. Обновляем ссылки в канвасах
      setProgress(75);
      setProgressMessage('Обновление связей...');
      
      for (const [canvasId, canvas] of Object.entries(newCanvases)) {
        const oldNodeIds = (canvas as any).nodes || [];
        const newNodeIds: string[] = [];
        
        for (const oldId of oldNodeIds) {
          if (todoIdMap.has(oldId)) {
            newNodeIds.push(todoIdMap.get(oldId)!);
          } else if (imageIdMap.has(oldId)) {
            newNodeIds.push(imageIdMap.get(oldId)!);
          }
        }
        
        newCanvases[canvasId] = {
          ...canvas,
          nodes: newNodeIds,
        };
      }
      
      // 6. Создаем новый проект
      setProgress(80);
      setProgressMessage('Сохранение в базу данных...');
      
      const allPageIds = Object.keys(newPages);
      
      // 7. Сохраняем в IndexedDB
      // Сохраняем страницы
      for (const page of Object.values(newPages)) {
        await db.pages.put(page);
      }
      
      // Сохраняем канвасы
      for (const canvas of Object.values(newCanvases)) {
        await db.canvases.put(canvas);
      }
      
      // Сохраняем задачи
      if (Object.keys(newTodoNodes).length > 0) {
        await db.todos.bulkPut(Object.values(newTodoNodes));
      }
      
      // Сохраняем изображения
      if (Object.keys(newImageNodes).length > 0) {
        await db.images.bulkPut(Object.values(newImageNodes));
      }
      
      // Сохраняем проект
      await db.projects.put({
        id: newProjectId,
        name: newProjectName,
        pageIds: allPageIds,
        currentPageId: allPageIds[0] || null,
        createdAt: now,
        updatedAt: now,
        metadata: {
          createdAt: now,
          updatedAt: now,
        },
      });
      
      // 8. Обновляем Redux состояние
      setProgress(90);
      setProgressMessage('Обновление состояния...');
      
      // Получаем все проекты из базы
      const allProjectsFromDB = await db.projects.toArray();
      const projectsMap = allProjectsFromDB.reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {} as Record<string, any>);
      
      // Получаем все страницы
      const allPagesFromDB = await db.pages.toArray();
      const pagesMap = allPagesFromDB.reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {} as Record<string, any>);
      
      // Получаем все канвасы
      const allCanvasesFromDB = await db.canvases.toArray();
      const canvasesMap = allCanvasesFromDB.reduce((acc, c) => {
        acc[c.id] = c;
        return acc;
      }, {} as Record<string, any>);
      
      // Обновляем Redux
      dispatch(loadProjectState({
        currentProjectId: newProjectId,
        projects: projectsMap,
        pages: pagesMap,
        canvases: canvasesMap,
        projectOrder: allProjectsFromDB.map(p => p.id),
      }));
      
      // Импортируем ноды в Redux
      dispatch(importNodes(newTodoNodes));
      dispatch({ type: 'imageNodes/importImages', payload: newImageNodes });
      
      await loadStats();
      
      setProgress(100);
      setProgressMessage(`✅ Импорт завершен! Задач: ${Object.keys(newTodoNodes).length}, Страниц: ${Object.keys(newPages).length}`);
      
      setTimeout(() => {
        setProgress(0);
        setProgressMessage('');
      }, 3000);
      
      alert(
        `✅ Проект успешно импортирован!\n\n` +
        `📁 Название: ${newProjectName}\n` +
        `📝 Задач: ${Object.keys(newTodoNodes).length}\n` +
        `🖼️ Изображений: ${Object.keys(newImageNodes).length}\n` +
        `📄 Страниц: ${Object.keys(newPages).length}\n\n` +
        `🔄 Проект добавлен в список. Перезагрузите страницу или откройте Projects.`
      );
      
      // Закрываем модалку если нужно
      if (modalMode && onClose) onClose();
      
      // Вызываем колбэк об успешном импорте, если передан
      if (onImportComplete) {
        onImportComplete();
      }
      
    } catch (error) {
      console.error('❌ Ошибка импорта:', error);
      alert(`❌ Ошибка при импорте проекта:\n${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      setProgress(0);
      setProgressMessage('');
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  }, [dispatch, loadStats, modalMode, onClose, onImportComplete]);

  // Функция для ручного сохранения в оба хранилища
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    
    try {
      const successTodos = TodoStorage.saveTodos(todoNodes);
      const successImages = ImageStorage.saveImages(imageNodes);
      
      const projectState = {
        currentProjectId: project.currentProjectId,
        projects: project.projects || {},
        pages: project.pages || {},
        canvases: project.canvases || {},
      };
      const successProject = TodoStorage.saveProjectState(projectState);
      
      await TodoIndexedDBStorage.saveTodos(todoNodes);
      await ImageIndexedDBStorage.saveImages(imageNodes);
      await ProjectIndexedDBStorage.saveProject(projectState);
      
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
      const localTodos = TodoStorage.loadTodos();
      const localImages = ImageStorage.loadImages();
      const localProjectStr = localStorage.getItem('project_state');
      const localProject = localProjectStr ? JSON.parse(localProjectStr) : null;
      
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
        db.fileStorage.clear(),
        db.fileMetadata.clear(),
      ]);
      
      await loadStats();
      alert('✅ IndexedDB очищена');
    } catch (error) {
      console.error('❌ Ошибка очистки IndexedDB:', error);
      alert('❌ Ошибка при очистке');
    }
  }, [loadStats]);

  // Функция для очистки localStorage и Redux
  const handleClearLocalStorage = useCallback(() => {
    if (window.confirm('Удалить все данные из Redux и localStorage?')) {
      dispatch(clearAllNodes());
      dispatch(clearAllImages());
      TodoStorage.clearAll();
      ImageStorage.clearAll();
      loadStats();
      alert('✅ localStorage и Redux очищены');
    }
  }, [dispatch, loadStats]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Никогда';
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const containerClass = modalMode ? 'storage-manager storage-manager-modal' : 'storage-manager';

  return (
    <div className={containerClass}>
      <div className="storage-header">
        <h3>💾 Управление хранилищем</h3>
        <div className="storage-header-actions">
          <button 
            onClick={loadStats} 
            className="storage-btn storage-btn-refresh"
            disabled={isRefreshing}
            title="Обновить статистику"
          >
            {isRefreshing ? '🔄' : '↻'}
          </button>
        </div>
      </div>
      
      {(isExporting || isImporting) && progress > 0 && (
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-message">{progressMessage}</div>
          <div className="progress-percent">{progress}%</div>
        </div>
      )}
      
      <div className="storage-comparison">
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
          {currentProject && (
            <div className="stat-item">
              <span className="stat-label">📁 Активный проект:</span>
              <span className="stat-value">{currentProject.name}</span>
            </div>
          )}
        </div>
      </div>

      <div className="storage-actions">
        <button 
          onClick={handleSave}
          className="storage-btn storage-btn-save"
          disabled={isSaving || isExporting || isImporting}
        >
          {isSaving ? '💾 Сохранение...' : '💾 Сохранить все'}
        </button>
        
        <button 
          onClick={handleExport}
          className="storage-btn storage-btn-export"
          disabled={isExporting || isImporting || (todoCount === 0 && imageCount === 0)}
        >
          {isExporting ? '📦 Экспорт...' : '📦 Экспорт проекта'}
        </button>
        
        <button 
          onClick={handleMigrate} 
          className="storage-btn storage-btn-migrate"
          disabled={isSaving || stats.indexedDB.todos > 0}
        >
          🚀 Миграция
        </button>
        
        <button 
          onClick={handleClearIndexedDB} 
          className="storage-btn storage-btn-clear-idb"
          disabled={isSaving}
        >
          🗑️ Очистить IDB
        </button>
        
        <button 
          onClick={() => fileInputRef.current?.click()} 
          className="storage-btn storage-btn-import"
          disabled={isExporting || isImporting}
        >
          {isImporting ? '📥 Импорт...' : '📥 Импорт проекта'}
        </button>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImport}
          accept=".canvas,.json"
          style={{ display: 'none' }}
        />
        
        <button 
          onClick={handleClearLocalStorage} 
          className="storage-btn storage-btn-clear"
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
          <strong>Формат экспорта:</strong>{' '}
          <span style={{ color: '#17a2b8' }}>📦 .canvas (ZIP архив с изображениями + JSON)</span>
        </small>
      </div>
    </div>
  );
};