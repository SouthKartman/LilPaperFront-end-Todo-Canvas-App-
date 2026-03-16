// src/features/project-management/lib/useProjects.ts
import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@shared/lib/state/store';
import {
  createProject,
  addPage,
  switchPage,
  updateCanvas,
  addNodeToCanvas,
  removeNodeFromCanvas,
  setPageName,
  removePage,
  reorderPages,
  setCurrentProject,
  updateProjectName,
  deleteProject,
  reorderProjects,
  setProjectOrder,
} from '../model/slice';
import {
  selectCurrentProject,
  selectCurrentPage,
  selectCurrentCanvas,
  selectProjectPages,
  selectAllProjects,
  selectRecentProjects,
  selectCurrentCanvasViewport,
  selectCurrentCanvasGrid,
} from '../model/selectors';
import { Canvas } from '@entities/canvas/model/types';
import { RootState } from '@shared/lib/state/store';

export const useProjects = () => {
  const dispatch = useAppDispatch();
  
  // Используем селекторы напрямую, без дополнительной логики
  const currentProject = useAppSelector(selectCurrentProject);
  const currentPage = useAppSelector(selectCurrentPage);
  const currentCanvas = useAppSelector(selectCurrentCanvas);
  const pages = useAppSelector(selectProjectPages);
  const allProjects = useAppSelector(selectAllProjects);
  const recentProjects = useAppSelector(selectRecentProjects);
  const canvasViewport = useAppSelector(selectCurrentCanvasViewport);
  const canvasGrid = useAppSelector(selectCurrentCanvasGrid);

  // Проекты
  const createNewProject = useCallback((name: string) => {
    console.log('🚀 Создание проекта:', name);
    dispatch(createProject({ name }));
  }, [dispatch]);

  const openProject = useCallback((projectId: string) => {
    console.log('📂 Открытие проекта:', projectId);
    dispatch(setCurrentProject(projectId));
  }, [dispatch]);

  const renameProject = useCallback((projectId: string, name: string) => {
    console.log('✏️ Переименование проекта:', projectId, name);
    dispatch(updateProjectName({ projectId, name }));
  }, [dispatch]);

  const deleteProject = useCallback((projectId: string) => {
    console.log('🗑️ useProjects: удаление проекта', projectId);
    dispatch(deleteProject(projectId));
  }, [dispatch]);

  // Переупорядочивание проектов
  const reorderProjectsList = useCallback((oldIndex: number, newIndex: number) => {
    console.log('🔄 Переупорядочивание проектов:', { oldIndex, newIndex });
    dispatch(reorderProjects({ oldIndex, newIndex }));
  }, [dispatch]);

  // Установка кастомного порядка
  const setCustomProjectOrder = useCallback((order: string[]) => {
    console.log('📋 Установка порядка проектов:', order);
    dispatch(setProjectOrder(order));
  }, [dispatch]);

  // Страницы
  const createPage = useCallback((projectId: string, name?: string, copyFromPageId?: string) => {
    console.log('📄 Создание страницы в проекте:', projectId);
    dispatch(addPage({ projectId, name, copySettingsFromPageId: copyFromPageId }));
  }, [dispatch]);

  const switchToPage = useCallback((projectId: string, pageId: string) => {
    console.log('🔄 Переключение на страницу:', pageId);
    dispatch(switchPage({ projectId, pageId }));
  }, [dispatch]);

  const renamePage = useCallback((pageId: string, name: string) => {
    console.log('✏️ Переименование страницы:', pageId, name);
    dispatch(setPageName({ pageId, name }));
  }, [dispatch]);

  const deletePage = useCallback((projectId: string, pageId: string) => {
    console.log('🗑️ Удаление страницы:', pageId);
    dispatch(removePage({ projectId, pageId }));
  }, [dispatch]);

  const reorderPagesList = useCallback((projectId: string, fromIndex: number, toIndex: number) => {
    console.log('🔄 Переупорядочивание страниц:', { projectId, fromIndex, toIndex });
    dispatch(reorderPages({ projectId, fromIndex, toIndex }));
  }, [dispatch]);

  // Полотна
  const updateCanvasSettings = useCallback((
    canvasId: string,
    updates: Partial<Omit<Canvas, 'id' | 'pageId' | 'metadata'>>
  ) => {
    console.log('🎨 Обновление полотна:', canvasId, updates);
    dispatch(updateCanvas({ canvasId, updates }));
  }, [dispatch]);

  const addNode = useCallback((canvasId: string, nodeId: string) => {
    console.log('➕ Добавление ноды:', nodeId, 'на полотно:', canvasId);
    dispatch(addNodeToCanvas({ canvasId, nodeId }));
  }, [dispatch]);

  const removeNode = useCallback((canvasId: string, nodeId: string) => {
    console.log('➖ Удаление ноды:', nodeId, 'с полотна:', canvasId);
    dispatch(removeNodeFromCanvas({ canvasId, nodeId }));
  }, [dispatch]);

  const getPageCanvas = useCallback((pageId: string) => {
    return (state: RootState) => {
      const page = state.project.pages[pageId];
      if (!page?.canvasId) return null;
      return state.project.canvases[page.canvasId];
    };
  }, []);

  const exportProjects = useCallback(() => {
  console.log('📤 Экспорт проектов');
  
  const exportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    projects: allProjects,
    totalCount: allProjects.length
  };
  
  const dataStr = JSON.stringify(exportData, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  
  const exportFileDefaultName = `projects-export-${new Date().toISOString().split('T')[0]}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
}, [allProjects]);

  // Импорт проектов
  const importProjects = useCallback((file: File) => {
    console.log('📥 Импорт проектов:', file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importData = JSON.parse(content);
        
        if (importData.projects && Array.isArray(importData.projects)) {
          // TODO: Добавить логику импорта проектов
          console.log('📦 Данные для импорта:', importData);
          
          // Здесь нужно будет создать проекты из импортированных данных
          importData.projects.forEach((project: CanvasProject) => {
            createNewProject(project.name);
          });
          
          alert(`Successfully imported ${importData.projects.length} projects`);
        } else {
          alert('Invalid file format');
        }
      } catch (error) {
        console.error('Import error:', error);
        alert('Error importing file');
      }
    };
    reader.readAsText(file);
  }, [createNewProject]);

  return {
    // Данные
    currentProject,
    currentPage,
    currentCanvas,
    pages,
    allProjects,
    recentProjects,
    canvasViewport,
    canvasGrid,
    
    // Проекты
    createNewProject,
    openProject,
    renameProject,
    deleteProject,
    reorderProjectsList,
    setCustomProjectOrder,
    exportProjects,
    importProjects,
    
    // Страницы
    createPage,
    switchToPage,
    renamePage,
    deletePage,
    reorderPagesList,
    
    // Полотна
    updateCanvasSettings,
    addNode,
    removeNode,
    getPageCanvas,
  };
};