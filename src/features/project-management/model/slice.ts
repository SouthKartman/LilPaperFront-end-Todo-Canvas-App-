import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { CanvasProject, CanvasPage, Canvas, generateId } from '@entities/canvas/model/types';
import { ProjectIndexedDBStorage } from '@shared/api/storage/indexedDB/projectStorage';
import { TodoIndexedDBStorage } from '@shared/api/storage/indexedDB/todoStorage';
import { ImageIndexedDBStorage } from '@shared/api/storage/indexedDB/imageStorage';

interface ProjectState {
  currentProjectId: string | null;
  projects: Record<string, CanvasProject>;
  pages: Record<string, CanvasPage>;
  canvases: Record<string, Canvas>;
  projectOrder: string[];
  loading: boolean;
  error: string | null;
}

const initialState: ProjectState = {
  currentProjectId: null,
  projects: {},
  pages: {},
  canvases: {},
  projectOrder: [],
  loading: false,
  error: null,
};

// 🆕 THUNK ДЛЯ ПЕРЕИМЕНОВАНИЯ ПРОЕКТА В INDEXEDDB
export const renameProjectInDB = createAsyncThunk(
  'project/renameProjectInDB',
  async ({ projectId, name }: { projectId: string; name: string }, { rejectWithValue }) => {
    try {
      const success = await ProjectIndexedDBStorage.updateProject(projectId, { name });
      
      if (!success) {
        throw new Error('Не удалось переименовать проект в базе данных');
      }
      
      console.log(`✅ Проект ${projectId} переименован в "${name}" в IndexedDB`);
      
      return { projectId, name };
    } catch (error) {
      console.error('❌ Ошибка при переименовании проекта в БД:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Ошибка переименования');
    }
  }
);

// 🆕 THUNK ДЛЯ УДАЛЕНИЯ СТРАНИЦЫ ИЗ INDEXEDDB
export const deletePageFromDB = createAsyncThunk(
  'project/deletePageFromDB',
  async ({ projectId, pageId }: { projectId: string; pageId: string }, { dispatch, getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const page = state.project.pages[pageId];
      
      if (!page) {
        throw new Error('Страница не найдена');
      }
      
      // Получаем все задачи на этой странице
      const todos = Object.values(state.todoNodes.nodes || {});
      const pageTodos = todos.filter((todo: any) => todo.pageId === pageId);
      
      // Удаляем все задачи страницы из IndexedDB
      if (pageTodos.length > 0) {
        const todoIds = pageTodos.map((todo: any) => todo.id);
        await TodoIndexedDBStorage.deleteTodos(todoIds);
        console.log(`✅ Удалено ${todoIds.length} задач страницы ${pageId} из IndexedDB`);
      }
      
      // Получаем все изображения на этой странице
      const images = Object.values(state.imageNodes?.nodes || {});
      const pageImages = images.filter((img: any) => img.pageId === pageId);
      
      // Удаляем все изображения страницы из IndexedDB
      if (pageImages.length > 0) {
        const imageIds = pageImages.map((img: any) => img.id);
        await ImageIndexedDBStorage.deleteImages(imageIds);
        console.log(`✅ Удалено ${imageIds.length} изображений страницы ${pageId} из IndexedDB`);
      }
      
      // Удаляем страницу и ее полотно из IndexedDB
      const success = await ProjectIndexedDBStorage.deletePage(pageId);
      
      if (!success) {
        throw new Error('Не удалось удалить страницу из базы данных');
      }
      
      console.log(`✅ Страница ${pageId} успешно удалена из IndexedDB`);
      
      return { projectId, pageId };
    } catch (error) {
      console.error('❌ Ошибка при удалении страницы из БД:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Ошибка удаления страницы');
    }
  }
);

// 🆕 THUNK ДЛЯ ПЕРЕИМЕНОВАНИЯ СТРАНИЦЫ В INDEXEDDB
export const renamePageInDB = createAsyncThunk(
  'project/renamePageInDB',
  async ({ pageId, name }: { pageId: string; name: string }, { rejectWithValue }) => {
    try {
      const success = await ProjectIndexedDBStorage.updatePage(pageId, { name });
      
      if (!success) {
        throw new Error('Не удалось переименовать страницу в базе данных');
      }
      
      console.log(`✅ Страница ${pageId} переименована в "${name}" в IndexedDB`);
      
      return { pageId, name };
    } catch (error) {
      console.error('❌ Ошибка при переименовании страницы в БД:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Ошибка переименования');
    }
  }
);

// 🆕 THUNK ДЛЯ СОХРАНЕНИЯ СТРАНИЦЫ В INDEXEDDB
export const savePageToDB = createAsyncThunk(
  'project/savePageToDB',
  async (page: CanvasPage, { rejectWithValue }) => {
    try {
      const success = await ProjectIndexedDBStorage.savePage(page);
      
      if (!success) {
        throw new Error('Не удалось сохранить страницу в базу данных');
      }
      
      console.log(`✅ Страница ${page.id} сохранена в IndexedDB`);
      
      return page;
    } catch (error) {
      console.error('❌ Ошибка при сохранении страницы в БД:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Ошибка сохранения');
    }
  }
);

const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    // Создание проекта со страницей и полотном
    createProject: (state, action: PayloadAction<{ name: string }>) => {
      const projectId = generateId('project');
      const pageId = generateId('page');
      const canvasId = generateId('canvas');
      
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
      
      state.canvases[canvasId] = newCanvas;
      state.pages[pageId] = newPage;
      state.projects[projectId] = newProject;
      state.currentProjectId = projectId;
      
      if (!state.projectOrder) {
        state.projectOrder = [];
      }
      
      state.projectOrder.push(projectId);
      
      // Асинхронно сохраняем в IndexedDB
      setTimeout(() => {
        ProjectIndexedDBStorage.saveProject({
          currentProjectId: projectId,
          projects: { [projectId]: newProject },
          pages: { [pageId]: newPage },
          canvases: { [canvasId]: newCanvas },
          projectOrder: state.projectOrder,
        }).catch(console.error);
      }, 0);
    },
    
    // Переупорядочивание проектов
    reorderProjects: (state, action: PayloadAction<{ oldIndex: number; newIndex: number }>) => {
      const { oldIndex, newIndex } = action.payload;
      
      if (!state.projectOrder) {
        state.projectOrder = Object.keys(state.projects);
      }
      
      if (oldIndex < 0 || oldIndex >= state.projectOrder.length || 
          newIndex < 0 || newIndex >= state.projectOrder.length) {
        return;
      }
      
      const [movedProjectId] = state.projectOrder.splice(oldIndex, 1);
      state.projectOrder.splice(newIndex, 0, movedProjectId);
    },
    
    setProjectOrder: (state, action: PayloadAction<string[]>) => {
      const validOrder = action.payload.filter(id => state.projects[id]);
      state.projectOrder = validOrder;
    },
    
    // Удаление проекта
    deleteProject: (state, action: PayloadAction<string>) => {
      const projectId = action.payload;
      const project = state.projects[projectId];
      
      if (project) {
        project.pageIds.forEach(pageId => {
          const page = state.pages[pageId];
          if (page?.canvasId) {
            delete state.canvases[page.canvasId];
          }
          delete state.pages[pageId];
        });
        
        delete state.projects[projectId];
        
        if (!state.projectOrder) {
          state.projectOrder = Object.keys(state.projects);
        } else {
          const orderIndex = state.projectOrder.indexOf(projectId);
          if (orderIndex > -1) {
            state.projectOrder.splice(orderIndex, 1);
          }
        }
        
        if (state.currentProjectId === projectId) {
          const remainingIds = Object.keys(state.projects);
          state.currentProjectId = remainingIds[0] || null;
        }
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
      
      // Асинхронно сохраняем в IndexedDB
      setTimeout(() => {
        ProjectIndexedDBStorage.savePage(newPage).catch(console.error);
      }, 0);
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
        
        // Асинхронно обновляем в IndexedDB
        setTimeout(() => {
          ProjectIndexedDBStorage.updatePage(pageId, { name }).catch(console.error);
        }, 0);
      }
    },
    
    // 🆕 Переименование проекта
    setProjectName: (state, action: PayloadAction<{ projectId: string; name: string }>) => {
      const { projectId, name } = action.payload;
      const project = state.projects[projectId];
      
      if (project) {
        project.name = name;
        project.metadata.updatedAt = new Date();
        
        // Асинхронно обновляем в IndexedDB
        setTimeout(() => {
          ProjectIndexedDBStorage.updateProject(projectId, { name }).catch(console.error);
        }, 0);
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
      if (action.payload.projectOrder) {
        state.projectOrder = action.payload.projectOrder;
      } else {
        state.projectOrder = Object.keys(action.payload.projects);
      }
      
      state.currentProjectId = action.payload.currentProjectId;
      state.projects = action.payload.projects;
      state.pages = action.payload.pages;
      state.canvases = action.payload.canvases;
    },
  },
  extraReducers: (builder) => {
    builder
      // Удаление страницы из БД
      .addCase(deletePageFromDB.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deletePageFromDB.fulfilled, (state, action) => {
        const { projectId, pageId } = action.payload;
        const project = state.projects[projectId];
        
        if (project && project.pageIds.length > 1) {
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
        }
        
        state.loading = false;
      })
      .addCase(deletePageFromDB.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Ошибка удаления страницы';
      })
      
      // Переименование страницы в БД
      .addCase(renamePageInDB.fulfilled, (state, action) => {
        const { pageId, name } = action.payload;
        if (state.pages[pageId]) {
          state.pages[pageId].name = name;
          state.pages[pageId].metadata.updatedAt = new Date();
        }
      })
      
      // 🆕 Переименование проекта в БД
      .addCase(renameProjectInDB.fulfilled, (state, action) => {
        const { projectId, name } = action.payload;
        if (state.projects[projectId]) {
          state.projects[projectId].name = name;
          state.projects[projectId].metadata.updatedAt = new Date();
        }
      });
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
  setProjectName, // 🆕 Экспортируем новый action
  removePage,
  reorderPages,
  addNodeToPage,
  removeNodeFromPage,
  setCurrentProject,
  updateProjectName,
  deleteProject,
  loadProjectState,
  reorderProjects,
  setProjectOrder,
} = projectSlice.actions;

export default projectSlice.reducer;