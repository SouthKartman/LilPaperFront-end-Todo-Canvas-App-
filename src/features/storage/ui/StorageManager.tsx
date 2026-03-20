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
import { loadProjectState, setCurrentProject } from '@features/project-management/model/slice';
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
  onImportComplete?: () => void;
  onProjectCreated?: (projectId: string) => void;
}

export const StorageManager: React.FC<StorageManagerProps> = ({ 
  modalMode = false,
  onClose,
  onImportComplete,
  onProjectCreated 
}) => {
  const dispatch = useDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<any>(null);

  const refreshPage = useCallback(() => {
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }, []);

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

  // ============ ЭКСПОРТ ============
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
      
      setProgress(10);
      setProgressMessage('Сбор метаданных...');
      
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
      
      setProgress(20);
      setProgressMessage('Получение изображений...');
      
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
          
          const percent = 20 + (processedFiles / Math.max(1, imageFiles.length)) * 60;
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
      
      setProgress(85);
      setProgressMessage('Создание манифеста...');
      zip.file('project.json', JSON.stringify(exportData, null, 2));
      
      setProgress(90);
      setProgressMessage('Создание архива...');
      
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });
      
      setProgress(95);
      setProgressMessage('Сохранение файла...');
      
      const fileName = `${currentProject.name}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.canvas`;
      saveAs(zipBlob, fileName);
      
      setProgress(100);
      setProgressMessage(`✅ Экспорт завершен! Файлов: ${processedFiles}, Размер: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
      
      setTimeout(() => {
        setProgress(0);
        setProgressMessage('');
      }, 3000);
      
      alert(`✅ Проект "${currentProject.name}" успешно экспортирован!`);
      
    } catch (error) {
      console.error('❌ Ошибка экспорта:', error);
      alert('❌ Ошибка при экспорте проекта');
      setProgress(0);
      setProgressMessage('');
    } finally {
      setIsExporting(false);
    }
  }, [currentProject, todoNodes, imageNodes, project, todoCount, imageCount, pageCount]);

  // ============ ИМПОРТ ============
  
  // Функция для создания нового проекта
  const createNewProject = useCallback(async (
    todoNodesData: Record<string, any>,
    imageNodesData: Record<string, any>,
    projectStateData: any,
    projectName: string
  ) => {
    const newProjectId = `proj_${Date.now()}`;
    const newProjectName = `${projectName}_${new Date().toISOString().slice(0, 10)}`;
    const now = new Date().toISOString();
    
    // Создаем страницы
    const newPages: Record<string, any> = {};
    const oldPages = projectStateData.pages || {};
    const pageIdMap = new Map<string, string>();
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
    
    // Создаем канвасы
    const newCanvases: Record<string, any> = {};
    const oldCanvases = projectStateData.canvases || {};
    const oldCanvasList = Object.values(oldCanvases);
    
    for (let i = 0; i < pageIndex; i++) {
      const newPageId = Object.keys(newPages)[i];
      const newCanvasId = `${newProjectId}_canvas_${Date.now()}_${i}`;
      const oldCanvas = oldCanvasList[i] as any;
      
      newCanvases[newCanvasId] = {
        id: newCanvasId,
        pageId: newPageId,
        nodes: [],
        viewport: oldCanvas?.viewport || { x: 0, y: 0, zoom: 1 },
        background: oldCanvas?.background || '#f0f0f0',
        grid: oldCanvas?.grid || { size: 20, color: '#e0e0e0', isVisible: true },
        metadata: {
          createdAt: now,
          updatedAt: now,
        },
      };
      
      newPages[newPageId].canvasId = newCanvasId;
    }
    
    // Создаем задачи
    const newTodoNodes: Record<string, any> = {};
    const todoEntries = Object.entries(todoNodesData);
    
    for (let i = 0; i < todoEntries.length; i++) {
      const [oldId, todo] = todoEntries[i];
      const newId = `${newProjectId}_todo_${Date.now()}_${i}`;
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
    
    // Создаем изображения
    const newImageNodes: Record<string, any> = {};
    const imageEntries = Object.entries(imageNodesData);
    
    for (let i = 0; i < imageEntries.length; i++) {
      const [oldId, image] = imageEntries[i];
      const newId = `${newProjectId}_img_${Date.now()}_${i}`;
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
    
    // Группируем ноды по страницам для добавления в канвасы
    const nodesByPage: Map<string, string[]> = new Map();
    
    for (const [id, todo] of Object.entries(newTodoNodes)) {
      const pageId = (todo as any).pageId;
      if (!nodesByPage.has(pageId)) nodesByPage.set(pageId, []);
      nodesByPage.get(pageId)!.push(id);
    }
    
    for (const [id, image] of Object.entries(newImageNodes)) {
      const pageId = (image as any).pageId;
      if (!nodesByPage.has(pageId)) nodesByPage.set(pageId, []);
      nodesByPage.get(pageId)!.push(id);
    }
    
    // Обновляем канвасы с ID нод
    for (const [canvasId, canvas] of Object.entries(newCanvases)) {
      const pageId = (canvas as any).pageId;
      const nodeIds = nodesByPage.get(pageId) || [];
      newCanvases[canvasId] = { ...canvas, nodes: nodeIds };
    }
    
    // Сохраняем в базу
    for (const page of Object.values(newPages)) await db.pages.put(page);
    for (const canvas of Object.values(newCanvases)) await db.canvases.put(canvas);
    if (Object.keys(newTodoNodes).length > 0) await db.todos.bulkPut(Object.values(newTodoNodes));
    if (Object.keys(newImageNodes).length > 0) await db.images.bulkPut(Object.values(newImageNodes));
    
    await db.projects.put({
      id: newProjectId,
      name: newProjectName,
      pageIds: Object.keys(newPages),
      currentPageId: Object.keys(newPages)[0] || null,
      createdAt: now,
      updatedAt: now,
      metadata: { createdAt: now, updatedAt: now },
    });
    
    return { newProjectId, newProjectName, todoNodes: newTodoNodes, imageNodes: newImageNodes, pages: newPages, canvases: newCanvases };
  }, []);
  
  // Функция для добавления к существующему проекту
  const addToExistingProject = useCallback(async (
    targetProjectId: string,
    todoNodesData: Record<string, any>,
    imageNodesData: Record<string, any>,
    projectStateData: any
  ) => {
    const now = new Date().toISOString();
    const existingProject = await db.projects.get(targetProjectId);
    if (!existingProject) throw new Error('Проект не найден');
    
    const existingPages = await db.pages.where('projectId').equals(targetProjectId).toArray();
    const existingCanvases = await db.canvases.toArray();
    const existingPagesMap = new Map(existingPages.map(p => [p.name, p]));
    
    const pageIdMap = new Map<string, string>();
    const todoIdMap = new Map<string, string>();
    const imageIdMap = new Map<string, string>();
    
    const existingTodos = await db.todos.where('projectId').equals(targetProjectId).toArray();
    const maxX = Math.max(...existingTodos.map(t => t.position?.x || 0), 0);
    const maxY = Math.max(...existingTodos.map(t => t.position?.y || 0), 0);
    const offsetX = maxX + 300;
    const offsetY = maxY + 150;
    
    const oldPages = projectStateData.pages || {};
    let pageIndex = existingPages.length;
    
    for (const [oldPageId, page] of Object.entries(oldPages)) {
      const pageName = (page as any).name || `Страница ${pageIndex + 1}`;
      let newPageId = existingPagesMap.get(pageName)?.id;
      
      if (!newPageId) {
        const newCanvasId = `${targetProjectId}_canvas_${Date.now()}_${pageIndex}`;
        newPageId = `${targetProjectId}_page_${Date.now()}_${pageIndex}`;
        pageIdMap.set(oldPageId, newPageId);
        
        await db.pages.put({
          id: newPageId, name: pageName, projectId: targetProjectId, canvasId: newCanvasId,
          metadata: { createdAt: now, updatedAt: now, order: pageIndex },
        });
        
        await db.canvases.put({
          id: newCanvasId, pageId: newPageId, nodes: [],
          viewport: { x: 0, y: 0, zoom: 1 }, background: '#f0f0f0',
          grid: { size: 20, color: '#e0e0e0', isVisible: true },
          metadata: { createdAt: now, updatedAt: now },
        });
        pageIndex++;
      } else {
        pageIdMap.set(oldPageId, newPageId);
      }
    }
    
    // Создаем новые задачи
    const todoEntries = Object.entries(todoNodesData);
    const newTodos = [];
    for (let i = 0; i < todoEntries.length; i++) {
      const [oldId, todo] = todoEntries[i];
      const newId = `${targetProjectId}_todo_${Date.now()}_${i}`;
      todoIdMap.set(oldId, newId);
      const oldPageId = (todo as any).pageId;
      const newPageId = pageIdMap.get(oldPageId) || existingPages[0]?.id || null;
      
      newTodos.push({
        id: newId, title: (todo as any).title || 'Новая задача',
        description: (todo as any).description || '', status: (todo as any).status || 'todo',
        priority: (todo as any).priority || 'medium', createdAt: now, updatedAt: now,
        tags: (todo as any).tags || [],
        position: { x: ((todo as any).position?.x || 100) + offsetX, y: ((todo as any).position?.y || 100) + offsetY },
        size: (todo as any).size || { width: 280, height: 150 }, pageId: newPageId, projectId: targetProjectId,
      });
    }
    
    // Создаем новые изображения
    const imageEntries = Object.entries(imageNodesData);
    const newImages = [];
    for (let i = 0; i < imageEntries.length; i++) {
      const [oldId, image] = imageEntries[i];
      const newId = `${targetProjectId}_img_${Date.now()}_${i}`;
      imageIdMap.set(oldId, newId);
      const oldPageId = (image as any).pageId;
      const newPageId = pageIdMap.get(oldPageId) || existingPages[0]?.id || null;
      
      newImages.push({
        id: newId, type: 'image',
        position: { x: ((image as any).position?.x || 100) + offsetX, y: ((image as any).position?.y || 100) + offsetY },
        size: (image as any).size || { width: 300, height: 200 }, zIndex: (image as any).zIndex || 1000,
        filePath: (image as any).filePath || '', originalName: (image as any).originalName || 'image.jpg',
        fileSize: (image as any).fileSize || 0, mimeType: (image as any).mimeType || 'image/jpeg',
        createdAt: now, updatedAt: now, pageId: newPageId, projectId: targetProjectId,
      });
    }
    
    if (newTodos.length > 0) await db.todos.bulkPut(newTodos);
    if (newImages.length > 0) await db.images.bulkPut(newImages);
    
    // Группируем новые ноды по страницам
    const nodesByPage: Map<string, string[]> = new Map();
    for (const todo of newTodos) {
      if (!nodesByPage.has(todo.pageId)) nodesByPage.set(todo.pageId, []);
      nodesByPage.get(todo.pageId)!.push(todo.id);
    }
    for (const image of newImages) {
      if (!nodesByPage.has(image.pageId)) nodesByPage.set(image.pageId, []);
      nodesByPage.get(image.pageId)!.push(image.id);
    }
    
    // Обновляем канвасы
    const existingCanvasesMap = new Map(existingCanvases.map(c => [c.pageId, c]));
    for (const [pageId, nodeIds] of nodesByPage) {
      const existingCanvas = existingCanvasesMap.get(pageId);
      if (existingCanvas) {
        await db.canvases.update(existingCanvas.id, {
          nodes: [...(existingCanvas.nodes || []), ...nodeIds],
          updatedAt: now,
        });
      }
    }
    
    await db.projects.update(targetProjectId, {
      updatedAt: now,
      metadata: { ...existingProject.metadata, updatedAt: now },
    });
    
    return { addedTodos: newTodos.length, addedImages: newImages.length };
  }, []);
  
  // Завершение импорта
  const completeImport = useCallback(async (result: any, isNewProject: boolean, targetProjectId?: string) => {
    setProgress(80);
    setProgressMessage('Обновление состояния...');
    
    const allProjects = await db.projects.toArray();
    const projectsMap = allProjects.reduce((acc, p) => { acc[p.id] = p; return acc; }, {} as Record<string, any>);
    const allPages = await db.pages.toArray();
    const pagesMap = allPages.reduce((acc, p) => { acc[p.id] = p; return acc; }, {} as Record<string, any>);
    const allCanvases = await db.canvases.toArray();
    const canvasesMap = allCanvases.reduce((acc, c) => { acc[c.id] = c; return acc; }, {} as Record<string, any>);
    
    const newProjectId = result.newProjectId || targetProjectId;
    const newProjectName = result.newProjectName || (result.project?.name) || 'Импортированный проект';
    
    if (isNewProject && result.todoNodes) {
      dispatch(importNodes(result.todoNodes));
      dispatch({ type: 'imageNodes/importImages', payload: result.imageNodes });
    }
    
    dispatch(loadProjectState({
      currentProjectId: newProjectId,
      projects: projectsMap,
      pages: pagesMap,
      canvases: canvasesMap,
      projectOrder: allProjects.map(p => p.id),
    }));
    
    if (isNewProject) dispatch(setCurrentProject(newProjectId));
    
    await loadStats();
    
    setProgress(100);
    const addedMessage = result.addedTodos ? `Добавлено задач: ${result.addedTodos}, изображений: ${result.addedImages}` : '';
    setProgressMessage(`✅ Импорт завершен! ${addedMessage}`);
    
    setTimeout(() => { setProgress(0); setProgressMessage(''); }, 3000);
    
    const message = isNewProject
      ? `✅ Новый проект "${newProjectName}" создан!\n\n📝 Задач: ${Object.keys(result.todoNodes || {}).length}\n🖼️ Изображений: ${Object.keys(result.imageNodes || {}).length}\n📄 Страниц: ${Object.keys(result.pages || {}).length}\n\n🔄 Страница будет обновлена...`
      : `✅ Проект обновлен!\n\n${addedMessage}\n\n🔄 Страница будет обновлена...`;
    
    alert(message);
    
    if (modalMode && onClose) onClose();
    if (onImportComplete) onImportComplete();
    if (isNewProject && onProjectCreated) onProjectCreated(newProjectId);
    
    refreshPage();
  }, [dispatch, loadStats, modalMode, onClose, onImportComplete, onProjectCreated, refreshPage]);
  
  // Основная функция импорта
  const performImport = useCallback(async (importData: any) => {
    setIsImporting(true);
    setProgress(0);
    setProgressMessage('Обработка данных...');
    
    try {
      const todoNodesData = importData.data?.todoNodes || importData.todoNodes || {};
      const imageNodesData = importData.data?.imageNodes || importData.imageNodes || {};
      const projectStateData = importData.data?.project || importData.project || {};
      const projectName = projectStateData.projects?.[projectStateData.currentProjectId]?.name || 
                          importData.stats?.projectName || 'Импортированный проект';
      const sourceProjectId = importData.project?.id || projectStateData.currentProjectId;
      
      setProgress(20);
      setProgressMessage(`Анализ данных: ${Object.keys(todoNodesData).length} задач, ${Object.keys(imageNodesData).length} изображений`);
      
      const existingProject = sourceProjectId ? await db.projects.get(sourceProjectId) : null;
      
      if (existingProject && Object.keys(todoNodesData).length > 0) {
        setShowConfirmDialog(true);
        setPendingImportData({ importData, todoNodesData, imageNodesData, projectStateData, projectName, sourceProjectId });
        setIsImporting(false);
        return;
      } else {
        setProgress(30);
        setProgressMessage(`Создание нового проекта...`);
        const result = await createNewProject(todoNodesData, imageNodesData, projectStateData, projectName);
        await completeImport(result, true);
      }
    } catch (error) {
      console.error('❌ Ошибка импорта:', error);
      alert(`❌ Ошибка при импорте:\n${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      setProgress(0);
      setProgressMessage('');
    } finally {
      if (!showConfirmDialog) setIsImporting(false);
    }
  }, [createNewProject, completeImport]);
  
  const handleConfirmAddToExisting = useCallback(async () => {
    if (!pendingImportData) return;
    setShowConfirmDialog(false);
    setIsImporting(true);
    setProgress(0);
    setProgressMessage('Добавление к существующему проекту...');
    
    try {
      const { todoNodesData, imageNodesData, projectStateData, sourceProjectId } = pendingImportData;
      const result = await addToExistingProject(sourceProjectId, todoNodesData, imageNodesData, projectStateData);
      await completeImport(result, false, sourceProjectId);
    } catch (error) {
      console.error('❌ Ошибка добавления:', error);
      alert(`❌ Ошибка при добавлении:\n${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setIsImporting(false);
      setPendingImportData(null);
    }
  }, [pendingImportData, addToExistingProject, completeImport]);
  
  const handleConfirmCreateNew = useCallback(async () => {
    if (!pendingImportData) return;
    setShowConfirmDialog(false);
    setIsImporting(true);
    setProgress(0);
    setProgressMessage('Создание нового проекта...');
    
    try {
      const { todoNodesData, imageNodesData, projectStateData, projectName } = pendingImportData;
      const result = await createNewProject(todoNodesData, imageNodesData, projectStateData, projectName);
      await completeImport(result, true);
    } catch (error) {
      console.error('❌ Ошибка создания проекта:', error);
      alert(`❌ Ошибка при создании проекта:\n${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setIsImporting(false);
      setPendingImportData(null);
    }
  }, [pendingImportData, createNewProject, completeImport]);
  
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.canvas') && !file.name.endsWith('.json')) {
      alert('Пожалуйста, выберите файл проекта (.canvas или .json)');
      event.target.value = '';
      return;
    }
    
    setProgress(0);
    setProgressMessage('Чтение файла...');
    
    try {
      let projectData: any;
      if (file.name.endsWith('.canvas')) {
        const zip = await JSZip.loadAsync(file);
        const manifestFile = zip.file('project.json');
        if (!manifestFile) throw new Error('project.json не найден в архиве');
        projectData = JSON.parse(await manifestFile.async('string'));
      } else {
        projectData = JSON.parse(await file.text());
      }
      await performImport(projectData);
    } catch (error) {
      console.error('❌ Ошибка чтения файла:', error);
      alert(`❌ Ошибка при чтении файла:\n${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      event.target.value = '';
    }
  }, [performImport]);

  // ============ ОСТАЛЬНЫЕ ФУНКЦИИ ============
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
      const savedCount = (successTodos ? Object.keys(todoNodes).length : 0) + (successImages ? Object.keys(imageNodes).length : 0);
      alert(`✅ Сохранено в оба хранилища: ${savedCount} элементов`);
    } catch (error) {
      console.error('❌ Ошибка сохранения:', error);
      alert('❌ Ошибка при сохранении');
    } finally {
      setIsSaving(false);
    }
  }, [todoNodes, imageNodes, project, loadStats]);

  const handleMigrate = useCallback(async () => {
    if (!window.confirm('Перенести данные из localStorage в IndexedDB? Старые данные останутся как резервная копия.')) return;
    setIsSaving(true);
    try {
      const localTodos = TodoStorage.loadTodos();
      const localImages = ImageStorage.loadImages();
      const localProjectStr = localStorage.getItem('project_state');
      const localProject = localProjectStr ? JSON.parse(localProjectStr) : null;
      if (Object.keys(localTodos).length > 0) await TodoIndexedDBStorage.saveTodos(localTodos);
      if (Object.keys(localImages).length > 0) await ImageIndexedDBStorage.saveImages(localImages);
      if (localProject) await ProjectIndexedDBStorage.saveProject(localProject);
      await loadStats();
      alert(`✅ Миграция завершена! Перенесено: ${Object.keys(localTodos).length} задач, ${Object.keys(localImages).length} изображений`);
    } catch (error) {
      console.error('❌ Ошибка миграции:', error);
      alert('❌ Ошибка при миграции');
    } finally {
      setIsSaving(false);
    }
  }, [loadStats]);

  const handleClearIndexedDB = useCallback(async () => {
    if (!window.confirm('Очистить IndexedDB? Это действие нельзя отменить.')) return;
    try {
      await Promise.all([db.todos.clear(), db.images.clear(), db.projects.clear(), db.pages.clear(), db.canvases.clear(), db.fileStorage.clear(), db.fileMetadata.clear()]);
      await loadStats();
      alert('✅ IndexedDB очищена');
    } catch (error) {
      console.error('❌ Ошибка очистки IndexedDB:', error);
      alert('❌ Ошибка при очистке');
    }
  }, [loadStats]);

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
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const containerClass = modalMode ? 'storage-manager storage-manager-modal' : 'storage-manager';

  return (
    <div className={containerClass}>
      {showConfirmDialog && (
        <div className="confirm-dialog-overlay">
          <div className="confirm-dialog">
            <h3>📥 Импорт проекта</h3>
            <p>Проект с таким ID уже существует. Как вы хотите поступить?</p>
            <div className="confirm-dialog-buttons">
              <button className="confirm-btn add" onClick={handleConfirmAddToExisting}>
                ➕ Добавить к существующему
                <span className="btn-desc">Новые задачи будут добавлены к текущим со смещением</span>
              </button>
              <button className="confirm-btn new" onClick={handleConfirmCreateNew}>
                ✨ Создать новый проект
                <span className="btn-desc">Будет создан отдельный проект</span>
              </button>
            </div>
            <button className="confirm-cancel" onClick={() => { setShowConfirmDialog(false); setPendingImportData(null); setIsImporting(false); }}>
              Отмена
            </button>
          </div>
        </div>
      )}

      <div className="storage-header">
        <h3>💾 Управление хранилищем</h3>
        <div className="storage-header-actions">
          <button onClick={loadStats} className="storage-btn storage-btn-refresh" disabled={isRefreshing} title="Обновить статистику">
            {isRefreshing ? '🔄' : '↻'}
          </button>
        </div>
      </div>
      
      {(isExporting || isImporting) && progress > 0 && (
        <div className="progress-container">
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
          <div className="progress-message">{progressMessage}</div>
          <div className="progress-percent">{progress}%</div>
        </div>
      )}
      
      <div className="storage-comparison">
        <div className={`storage-section ${activeStorage === 'localStorage' ? 'active' : ''}`}>
          <div className="storage-section-header"><h4>📦 localStorage</h4><span className="storage-badge">Старое хранилище</span></div>
          <div className="storage-stats">
            <div className="stat-item"><span className="stat-label">📝 Задачи:</span><span className="stat-value">{stats.localStorage.todos}</span></div>
            <div className="stat-item"><span className="stat-label">🖼️ Изображения:</span><span className="stat-value">{stats.localStorage.images}</span></div>
            {stats.localStorage.imageSize > 0 && (<div className="stat-item"><span className="stat-label">📦 Объем:</span><span className="stat-value">{formatFileSize(stats.localStorage.imageSize)}</span></div>)}
            <div className="stat-item"><span className="stat-label">📁 Проект:</span><span className="stat-value">{stats.localStorage.project ? '✅' : '❌'}</span></div>
            <div className="stat-item"><span className="stat-label">⏱️ Последнее:</span><span className="stat-value">{formatDate(stats.localStorage.lastSave)}</span></div>
          </div>
        </div>

        <div className={`storage-section ${activeStorage === 'indexedDB' ? 'active' : ''}`}>
          <div className="storage-section-header"><h4>🗄️ IndexedDB</h4><span className="storage-badge storage-badge-new">Новое хранилище</span></div>
          <div className="storage-stats">
            <div className="stat-item"><span className="stat-label">📝 Задачи:</span><span className="stat-value">{stats.indexedDB.todos}</span></div>
            <div className="stat-item"><span className="stat-label">🖼️ Изображения:</span><span className="stat-value">{stats.indexedDB.images}</span></div>
            {stats.indexedDB.imageSize > 0 && (<div className="stat-item"><span className="stat-label">📦 Объем:</span><span className="stat-value">{formatFileSize(stats.indexedDB.imageSize)}</span></div>)}
            <div className="stat-item"><span className="stat-label">📁 Проектов:</span><span className="stat-value">{stats.indexedDB.projects}</span></div>
            <div className="stat-item"><span className="stat-label">📄 Страниц:</span><span className="stat-value">{stats.indexedDB.pages}</span></div>
            <div className="stat-item"><span className="stat-label">🖼️ Полотен:</span><span className="stat-value">{stats.indexedDB.canvases}</span></div>
            {stats.indexedDB.dbSize && (<div className="stat-item"><span className="stat-label">💿 Размер БД:</span><span className="stat-value">{stats.indexedDB.dbSize}</span></div>)}
          </div>
        </div>
      </div>

      <div className="redux-stats">
        <h4>🔄 Текущее состояние (Redux)</h4>
        <div className="storage-stats">
          <div className="stat-item"><span className="stat-label">📝 Задач в памяти:</span><span className="stat-value">{todoCount}</span></div>
          <div className="stat-item"><span className="stat-label">🖼️ Изображений в памяти:</span><span className="stat-value">{imageCount}</span></div>
          <div className="stat-item"><span className="stat-label">📄 Страниц в памяти:</span><span className="stat-value">{pageCount}</span></div>
          {currentProject && (<div className="stat-item"><span className="stat-label">📁 Активный проект:</span><span className="stat-value">{currentProject.name}</span></div>)}
        </div>
      </div>

      <div className="storage-actions">
        <button onClick={handleSave} className="storage-btn storage-btn-save" disabled={isSaving || isExporting || isImporting}>
          {isSaving ? '💾 Сохранение...' : '💾 Сохранить все'}
        </button>
        <button onClick={handleExport} className="storage-btn storage-btn-export" disabled={isExporting || isImporting || (todoCount === 0 && imageCount === 0)}>
          {isExporting ? '📦 Экспорт...' : '📦 Экспорт проекта'}
        </button>
        <button onClick={handleMigrate} className="storage-btn storage-btn-migrate" disabled={isSaving || stats.indexedDB.todos > 0}>
          🚀 Миграция
        </button>
        <button onClick={handleClearIndexedDB} className="storage-btn storage-btn-clear-idb" disabled={isSaving}>
          🗑️ Очистить IDB
        </button>
        <button onClick={() => fileInputRef.current?.click()} className="storage-btn storage-btn-import" disabled={isExporting || isImporting}>
          {isImporting ? '📥 Импорт...' : '📥 Импорт проекта'}
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".canvas,.json" style={{ display: 'none' }} />
        <button onClick={handleClearLocalStorage} className="storage-btn storage-btn-clear">
          🧹 Очистить LS
        </button>
      </div>
      
      <div className="storage-info">
        <small><strong>Статус миграции:</strong> {stats.indexedDB.todos > 0 ? <span style={{ color: '#28a745' }}>✅ Данные в IndexedDB</span> : stats.localStorage.todos > 0 ? <span style={{ color: '#ffc107' }}>⚠️ Данные только в localStorage</span> : <span style={{ color: '#6c757d' }}>⏸️ Нет данных</span>}</small><br />
        <small><strong>Активное хранилище:</strong> {activeStorage === 'indexedDB' ? '🗄️ IndexedDB' : activeStorage === 'localStorage' ? '📦 localStorage' : '🔄 Оба хранилища'}</small><br />
        <small><strong>Формат экспорта:</strong> <span style={{ color: '#17a2b8' }}>📦 .canvas (ZIP архив с изображениями + JSON)</span></small>
      </div>

      <style>{`
        .confirm-dialog-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000;
        }
        .confirm-dialog {
          background: white; border-radius: 16px; padding: 24px; max-width: 450px; width: 90%;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .confirm-dialog h3 { margin: 0 0 12px 0; font-size: 20px; color: #333; }
        .confirm-dialog p { margin: 0 0 20px 0; color: #666; }
        .confirm-dialog-buttons { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
        .confirm-btn {
          padding: 14px 16px; border: 2px solid #e0e0e0; border-radius: 12px; background: white;
          cursor: pointer; text-align: left; font-size: 16px; font-weight: 600;
          transition: all 0.2s; display: flex; flex-direction: column; gap: 4px;
        }
        .confirm-btn:hover { border-color: #667eea; background: #f8f9ff; transform: translateY(-2px); }
        .confirm-btn.add { border-left: 4px solid #4caf50; }
        .confirm-btn.new { border-left: 4px solid #2196f3; }
        .btn-desc { font-size: 12px; font-weight: normal; color: #999; }
        .confirm-cancel { width: 100%; padding: 10px; border: 1px solid #e0e0e0; border-radius: 8px; background: white; cursor: pointer; font-size: 14px; }
        .confirm-cancel:hover { background: #f5f5f5; }
        .progress-container { margin: 16px 0; padding: 12px; background: #f8f9fa; border-radius: 8px; }
        .progress-bar { width: 100%; height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden; }
        .progress-fill { height: 100%; background: #667eea; transition: width 0.3s ease; border-radius: 4px; }
        .progress-message { font-size: 12px; color: #666; margin-top: 8px; }
        .progress-percent { font-size: 12px; font-weight: 500; color: #667eea; margin-top: 4px; }
      `}</style>
    </div>
  );
};