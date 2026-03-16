// src/features/project-management/model/slice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CanvasProject, CanvasPage, Canvas, generateId } from '@entities/canvas/model/types';

interface ProjectState {
  currentProjectId: string | null;
  projects: Record<string, CanvasProject>;
  pages: Record<string, CanvasPage>;
  canvases: Record<string, Canvas>;
  projectOrder: string[]; // Массив для хранения порядка проектов
}

const initialState: ProjectState = {
  currentProjectId: null,
  projects: {},
  pages: {},
  canvases: {},
  projectOrder: [], // Инициализируем пустым массивом
};

const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    // Создание проекта со страницей и полотном
    createProject: (state, action: PayloadAction<{ name: string }>) => {
      const projectId = generateId('project');
      const pageId = generateId('page');
      const canvasId = generateId('canvas');
      
      // Создаем полотно
      const newCanvas: Canvas = {
        id: canvasId,
        pageId: pageId,
        nodes: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        background: '#f0f0f0',
        grid: { size: 20, color: '#e0e0e0', isVisible: true },
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
      
      // Создаем страницу, привязанную к полотну
      const newPage: CanvasPage = {
        id: pageId,
        name: 'Страница 1',
        canvasId,
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          order: 0,
        },
      };
      
      const newProject: CanvasProject = {
        id: projectId,
        name: action.payload.name,
        pageIds: [pageId],
        currentPageId: pageId,
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
      
      // Сохраняем все сущности
      state.canvases[canvasId] = newCanvas;
      state.pages[pageId] = newPage;
      state.projects[projectId] = newProject;
      state.currentProjectId = projectId;
      
      // Убеждаемся что projectOrder существует
      if (!state.projectOrder) {
        state.projectOrder = [];
      }
      
      // Добавляем проект в конец списка порядка
      state.projectOrder.push(projectId);
      console.log('✅ Проект создан, projectOrder:', state.projectOrder);
    },
    
    // Переупорядочивание проектов (Drag & Drop)
    reorderProjects: (state, action: PayloadAction<{ oldIndex: number; newIndex: number }>) => {
      const { oldIndex, newIndex } = action.payload;
      
      console.log('🔄 Переупорядочивание:', { oldIndex, newIndex });
      console.log('📊 Текущий projectOrder:', state.projectOrder);
      
      // Проверяем что projectOrder существует
      if (!state.projectOrder) {
        console.warn('projectOrder не существует, создаем из projects');
        state.projectOrder = Object.keys(state.projects);
      }
      
      // Проверяем индексы
      if (oldIndex < 0 || oldIndex >= state.projectOrder.length || 
          newIndex < 0 || newIndex >= state.projectOrder.length) {
        console.warn('Invalid indices for reorder:', { oldIndex, newIndex });
        return;
      }
      
      // Перемещаем ID проекта в массиве порядка
      const [movedProjectId] = state.projectOrder.splice(oldIndex, 1);
      state.projectOrder.splice(newIndex, 0, movedProjectId);
      
      console.log('✅ Проекты переупорядочены, новый projectOrder:', state.projectOrder);
    },
    
    // Установка кастомного порядка проектов
    setProjectOrder: (state, action: PayloadAction<string[]>) => {
      // Проверяем, что все ID существуют
      const validOrder = action.payload.filter(id => state.projects[id]);
      state.projectOrder = validOrder;
    },
    
    // Удаление проекта
    deleteProject: (state, action: PayloadAction<string>) => {
      const projectId = action.payload;
      console.log('🗑️ Удаление проекта:', projectId);
      
      const project = state.projects[projectId];
      
      if (project) {
        // Удаляем все страницы и полотна проекта
        project.pageIds.forEach(pageId => {
          const page = state.pages[pageId];
          if (page?.canvasId) {
            delete state.canvases[page.canvasId];
          }
          delete state.pages[pageId];
        });
        
        // Удаляем сам проект
        delete state.projects[projectId];
        
        // Проверяем что projectOrder существует
        if (!state.projectOrder) {
          state.projectOrder = Object.keys(state.projects);
        } else {
          // Удаляем проект из массива порядка
          const orderIndex = state.projectOrder.indexOf(projectId);
          if (orderIndex > -1) {
            state.projectOrder.splice(orderIndex, 1);
          }
        }
        
        // Если удалили текущий проект, переключаемся на первый доступный
        if (state.currentProjectId === projectId) {
          const remainingIds = Object.keys(state.projects);
          state.currentProjectId = remainingIds[0] || null;
        }
        
        console.log('✅ Проект удален. Осталось:', Object.keys(state.projects).length);
        console.log('📊 Новый projectOrder:', state.projectOrder);
      }
    },
    
    // Создание страницы с новым полотном
    addPage: (state, action: PayloadAction<{ 
      projectId: string; 
      name?: string;
      copySettingsFromPageId?: string;
    }>) => {
      const { projectId, name, copySettingsFromPageId } = action.payload;
      const project = state.projects[projectId];
      
      if (!project) return;
      
      const pageId = generateId('page');
      const canvasId = generateId('canvas');
      
      let canvasSettings: Partial<Canvas> = {
        viewport: { x: 0, y: 0, zoom: 1 },
        background: '#f0f0f0',
        grid: { size: 20, color: '#e0e0e0', isVisible: true },
      };
      
      if (copySettingsFromPageId) {
        const sourcePage = state.pages[copySettingsFromPageId];
        if (sourcePage?.canvasId) {
          const sourceCanvas = state.canvases[sourcePage.canvasId];
          if (sourceCanvas) {
            canvasSettings = {
              viewport: { ...sourceCanvas.viewport },
              background: sourceCanvas.background,
              grid: { ...sourceCanvas.grid },
            };
          }
        }
      } else if (project.pageIds.length > 0) {
        const firstPageId = project.pageIds[0];
        const firstPage = state.pages[firstPageId];
        if (firstPage?.canvasId) {
          const firstCanvas = state.canvases[firstPage.canvasId];
          if (firstCanvas) {
            canvasSettings = {
              viewport: { ...firstCanvas.viewport },
              background: firstCanvas.background,
              grid: { ...firstCanvas.grid },
            };
          }
        }
      }
      
      const newCanvas: Canvas = {
        id: canvasId,
        pageId: pageId,
        nodes: [],
        viewport: canvasSettings.viewport!,
        background: canvasSettings.background!,
        grid: canvasSettings.grid!,
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
      
      const newPage: CanvasPage = {
        id: pageId,
        name: name || `Страница ${project.pageIds.length + 1}`,
        canvasId,
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          order: project.pageIds.length,
        },
      };
      
      state.canvases[canvasId] = newCanvas;
      state.pages[pageId] = newPage;
      project.pageIds.push(pageId);
      project.currentPageId = pageId;
      project.metadata.updatedAt = new Date();
    },
    
    switchPage: (state, action: PayloadAction<{ projectId: string; pageId: string }>) => {
      const { projectId, pageId } = action.payload;
      const project = state.projects[projectId];
      
      if (project && project.pageIds.includes(pageId)) {
        project.currentPageId = pageId;
        project.metadata.updatedAt = new Date();
      }
    },
    
    updateCanvas: (state, action: PayloadAction<{
      canvasId: string;
      updates: Partial<Omit<Canvas, 'id' | 'pageId' | 'metadata'>>;
    }>) => {
      const { canvasId, updates } = action.payload;
      const canvas = state.canvases[canvasId];
      
      if (canvas) {
        Object.assign(canvas, updates);
        canvas.metadata.updatedAt = new Date();
      }
    },
    
    addNodeToCanvas: (state, action: PayloadAction<{ canvasId: string; nodeId: string }>) => {
      const { canvasId, nodeId } = action.payload;
      const canvas = state.canvases[canvasId];
      
      if (canvas && !canvas.nodes.includes(nodeId)) {
        canvas.nodes.push(nodeId);
        canvas.metadata.updatedAt = new Date();
      }
    },
    
    removeNodeFromCanvas: (state, action: PayloadAction<{ canvasId: string; nodeId: string }>) => {
      const { canvasId, nodeId } = action.payload;
      const canvas = state.canvases[canvasId];
      
      if (canvas) {
        const index = canvas.nodes.indexOf(nodeId);
        if (index > -1) {
          canvas.nodes.splice(index, 1);
          canvas.metadata.updatedAt = new Date();
        }
      }
    },
    
    moveNodeBetweenCanvases: (state, action: PayloadAction<{
      nodeId: string;
      fromCanvasId: string;
      toCanvasId: string;
    }>) => {
      const { nodeId, fromCanvasId, toCanvasId } = action.payload;
      
      const fromCanvas = state.canvases[fromCanvasId];
      if (fromCanvas) {
        const index = fromCanvas.nodes.indexOf(nodeId);
        if (index > -1) {
          fromCanvas.nodes.splice(index, 1);
          fromCanvas.metadata.updatedAt = new Date();
        }
      }
      
      const toCanvas = state.canvases[toCanvasId];
      if (toCanvas && !toCanvas.nodes.includes(nodeId)) {
        toCanvas.nodes.push(nodeId);
        toCanvas.metadata.updatedAt = new Date();
      }
    },
    
    setPageName: (state, action: PayloadAction<{ pageId: string; name: string }>) => {
      const { pageId, name } = action.payload;
      const page = state.pages[pageId];
      
      if (page) {
        page.name = name;
        page.metadata.updatedAt = new Date();
      }
    },
    
    removePage: (state, action: PayloadAction<{ projectId: string; pageId: string }>) => {
      const { projectId, pageId } = action.payload;
      const project = state.projects[projectId];
      
      if (!project || project.pageIds.length <= 1) return;
      
      const pageIndex = project.pageIds.indexOf(pageId);
      if (pageIndex > -1) {
        const page = state.pages[pageId];
        if (page?.canvasId) {
          delete state.canvases[page.canvasId];
        }
        
        project.pageIds.splice(pageIndex, 1);
        delete state.pages[pageId];
        
        if (project.currentPageId === pageId) {
          project.currentPageId = project.pageIds[0];
        }
        
        project.pageIds.forEach((id, index) => {
          if (state.pages[id]) {
            state.pages[id].metadata.order = index;
          }
        });
        
        project.metadata.updatedAt = new Date();
      }
    },
    
    reorderPages: (state, action: PayloadAction<{ projectId: string; fromIndex: number; toIndex: number }>) => {
      const { projectId, fromIndex, toIndex } = action.payload;
      const project = state.projects[projectId];
      
      if (!project) return;
      
      const pageId = project.pageIds[fromIndex];
      project.pageIds.splice(fromIndex, 1);
      project.pageIds.splice(toIndex, 0, pageId);
      
      project.pageIds.forEach((id, index) => {
        if (state.pages[id]) {
          state.pages[id].metadata.order = index;
        }
      });
      
      project.metadata.updatedAt = new Date();
    },
    
    addNodeToPage: (state, action: PayloadAction<{ pageId: string; nodeId: string }>) => {
      const { pageId, nodeId } = action.payload;
      const page = state.pages[pageId];
      
      if (page?.canvasId) {
        const canvas = state.canvases[page.canvasId];
        if (canvas && !canvas.nodes.includes(nodeId)) {
          canvas.nodes.push(nodeId);
          canvas.metadata.updatedAt = new Date();
        }
      }
    },
    
    removeNodeFromPage: (state, action: PayloadAction<{ pageId: string; nodeId: string }>) => {
      const { pageId, nodeId } = action.payload;
      const page = state.pages[pageId];
      
      if (page?.canvasId) {
        const canvas = state.canvases[page.canvasId];
        if (canvas) {
          const index = canvas.nodes.indexOf(nodeId);
          if (index > -1) {
            canvas.nodes.splice(index, 1);
            canvas.metadata.updatedAt = new Date();
          }
        }
      }
    },
    
    setCurrentProject: (state, action: PayloadAction<string>) => {
      const projectId = action.payload;
      if (state.projects[projectId]) {
        state.currentProjectId = projectId;
      }
    },
    
    updateProjectName: (state, action: PayloadAction<{ projectId: string; name: string }>) => {
      const { projectId, name } = action.payload;
      const project = state.projects[projectId];
      
      if (project) {
        project.name = name;
        project.metadata.updatedAt = new Date();
      }
    },
    
    loadProjectState: (state, action: PayloadAction<ProjectState>) => {
      // При загрузке состояния восстанавливаем порядок
      if (action.payload.projectOrder) {
        state.projectOrder = action.payload.projectOrder;
      } else {
        // Если нет порядка, создаем его из проектов
        state.projectOrder = Object.keys(action.payload.projects);
      }
      
      state.currentProjectId = action.payload.currentProjectId;
      state.projects = action.payload.projects;
      state.pages = action.payload.pages;
      state.canvases = action.payload.canvases;
    },
  },
});

export const {
  createProject,
  addPage,
  switchPage,
  updateCanvas,
  addNodeToCanvas,
  removeNodeFromCanvas,
  moveNodeBetweenCanvases,
  setPageName,
  removePage,
  reorderPages,
  addNodeToPage,
  removeNodeFromPage,
  setCurrentProject,
  updateProjectName,
  deleteProject,
  loadProjectState,
  // Новые экспорты
  reorderProjects,
  setProjectOrder,
} = projectSlice.actions;

export default projectSlice.reducer;