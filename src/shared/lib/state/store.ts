// src/shared/lib/state/store.ts
import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import type { TypedUseSelectorHook } from 'react-redux'

// Импорты редьюсеров
import todoNodesReducer from '@features/todo-nodes/model/slice'
import canvasDndReducer from '@features/canvas-dnd/model/slice'
import contextMenuReducer from '@features/node-creations/model/slice'
import todoFormReducer from '@features/todo-form/model/slice'
import viewportReducer from '@features/canvas-viewport/model/slice'
import { autoSaveMiddleware } from '@features/storage/model/autoSaveMiddleware';
import imageNodesReducer from '@features/image-upload/model/slice'; // ✅ ИМПОРТ ДОБАВЛЕН

// 🆕 ИМПОРТИРУЕМ РЕДЬЮСЕР ПРОЕКТА
import projectReducer from '@features/project-management/model/slice'

// 🆕 ИМПОРТИРУЕМ МИДЛВАРЕ ДЛЯ СИНХРОНИЗАЦИИ ПОЛОТЕН
import { canvasSyncMiddleware } from '@processes/canvas-sync/lib/canvasSyncMiddleware'

// Заглушки для отсутствующих редьюсеров
// const canvasToolbarReducer = (state = {
//   activeTool: 'select',
//   tools: [],
// }, action: any) => {
//   switch (action.type) {
//     default:
//       return state
//   }
// }

// const propertiesPanelReducer = (state = {
//   isOpen: true,
//   selectedNodeId: null,
//   properties: {},
// }, action: any) => {
//   switch (action.type) {
//     default:
//       return state
//   }
// }

// const selectionReducer = (state = {
//   selectedNodeIds: [],
//   selectionRect: null,
// }, action: any) => {
//   switch (action.type) {
//     default:
//       return state
//   }
// }

// const canvasActionsReducer = (state = {
//   history: [],
//   currentAction: null,
// }, action: any) => {
//   switch (action.type) {
//     default:
//       return state
//   }
// }

// Создаем корневой редьюсер
const rootReducer = combineReducers({
  todoNodes: todoNodesReducer,
  canvasDnd: canvasDndReducer,
  contextMenu: contextMenuReducer,
  todoForm: todoFormReducer,
  viewport: viewportReducer,
  project: projectReducer, // 🆕 ДОБАВЛЕНО
  imageNodes: imageNodesReducer, // ✅ ДОБАВЛЕНО - редьюсер для изображений
  // canvasToolbar: canvasToolbarReducer,
  // propertiesPanel: propertiesPanelReducer,
  // selection: selectionReducer,
  // canvasActions: canvasActionsReducer,
})

// 🆕 Функция для загрузки начального состояния проекта с полотнами
const loadInitialProjectState = () => {
  if (typeof window === 'undefined') return undefined;
  
  try {
    const saved = localStorage.getItem('project_state');
    if (saved) {
      const parsed = JSON.parse(saved);
      
      // 🆕 Проверяем структуру и добавляем canvases если их нет
      if (parsed && typeof parsed === 'object') {
        // Если нет canvases, создаем пустой объект
        if (!parsed.canvases) {
          parsed.canvases = {};
        }
        
        // 🆕 Восстанавливаем связи между страницами и полотнами
        // Если есть старые данные без canvasId, создаем полотна для них
        if (parsed.pages && parsed.canvases) {
          Object.values(parsed.pages).forEach((page: any) => {
            if (page && !page.canvasId) {
              // Создаем новое полотно для старой страницы
              const canvasId = `canvas_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              parsed.canvases[canvasId] = {
                id: canvasId,
                pageId: page.id,
                nodes: page.nodes || [],
                viewport: page.viewport || { x: 0, y: 0, zoom: 1 },
                background: page.background || '#f0f0f0',
                grid: page.grid || { size: 20, color: '#e0e0e0', isVisible: true },
                metadata: {
                  createdAt: page.metadata?.createdAt || new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              };
              page.canvasId = canvasId;
              delete page.nodes;
              delete page.viewport;
              delete page.background;
              delete page.grid;
            }
          });
        }
        
        return parsed;
      }
    }
  } catch (error) {
    console.error('❌ Ошибка загрузки состояния проекта:', error);
  }
  return undefined;
};

// 🆕 Middleware для сохранения состояния проекта с полотнами
const projectSaveMiddleware = (store: any) => (next: any) => (action: any) => {
  const result = next(action);
  
  // Сохраняем состояние проекта после определенных действий
  const projectActions = [
    'project/createProject',
    'project/addPage',
    'project/switchPage',
    'project/removePage',
    'project/setPageName',
    'project/reorderPages',
    'project/setCurrentProject',
    'project/updateProjectName',
    'project/deleteProject',
    'project/updateCanvas', // 🆕 ДОБАВЛЕНО
    'project/addNodeToCanvas', // 🆕 ДОБАВЛЕНО
    'project/removeNodeFromCanvas', // 🆕 ДОБАВЛЕНО
    'project/moveNodeBetweenCanvases', // 🆕 ДОБАВЛЕНО
  ];
  
  if (projectActions.includes(action.type)) {
    setTimeout(() => {
      const state = store.getState();
      try {
        // 🆕 Сохраняем все состояние проекта включая полотна
        const projectState = {
          currentProjectId: state.project.currentProjectId,
          projects: state.project.projects,
          pages: state.project.pages,
          canvases: state.project.canvases, // 🆕 СОХРАНЯЕМ ПОЛОТНА
        };
        
        // Сериализуем с обработкой Date объектов
        const serializedState = JSON.stringify(projectState, (key, value) => {
          if (value instanceof Date) {
            return { __type: 'Date', value: value.toISOString() };
          }
          return value;
        });
        
        localStorage.setItem('project_state', serializedState);
        console.log('💾 Сохранено состояние проекта с полотнами');
      } catch (error) {
        console.error('❌ Ошибка сохранения состояния проекта:', error);
      }
    }, 0);
  }
  
  return result;
};

// 🆕 Middleware для обработки десериализации дат при загрузке
const dateReviverMiddleware = (store: any) => (next: any) => (action: any) => {
  // Если это действие загрузки состояния, обрабатываем даты
  if (action.type === 'project/loadProjectState' && action.payload) {
    const processedPayload = JSON.parse(JSON.stringify(action.payload), (key, value) => {
      if (value && typeof value === 'object' && value.__type === 'Date') {
        return new Date(value.value);
      }
      
      // 🆕 Конвертируем строки в даты для полей metadata
      if (key === 'createdAt' || key === 'updatedAt') {
        if (typeof value === 'string') {
          return new Date(value);
        }
      }
      
      return value;
    });
    
    return next({ ...action, payload: processedPayload });
  }
  
  return next(action);
};

// Единственный export store
export const store = configureStore({
  reducer: rootReducer,
  preloadedState: {
    project: loadInitialProjectState(), // 🆕 ПРЕЗАГРУЖАЕМ СОСТОЯНИЕ ПРОЕКТА С ПОЛОТНАМИ
  },
  
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'viewport/zoomToPoint', 
          'viewport/zoomIn', 
          'viewport/zoomOut',
          'project/createProject', // 🆕 ДОБАВЛЕНО
          'project/addPage', // 🆕 ДОБАВЛЕНО
          'project/switchPage', // 🆕 ДОБАВЛЕНО
          'project/updateCanvas', // 🆕 ДОБАВЛЕНО
          'project/setPageName', // 🆕 ДОБАВЛЕНО
          'imageNodes/addImageNode', // ✅ ДОБАВЛЕНО - игнорируем base64
          'imageNodes/addImageNodes', // ✅ ДОБАВЛЕНО
        ],
        ignoredPaths: [
          'viewport.lastZoomPoint',
          'todoNodes.nodes',
          'project.pages', // 🆕 ДОБАВЛЕНО
          'project.projects', // 🆕 ДОБАВЛЕНО
          'project.canvases', // 🆕 ДОБАВЛЕНО
          'project.pages.*.metadata.createdAt', // 🆕 ДОБАВЛЕНО
          'project.pages.*.metadata.updatedAt', // 🆕 ДОБАВЛЕНО
          'project.projects.*.metadata.createdAt', // 🆕 ДОБАВЛЕНО
          'project.projects.*.metadata.updatedAt', // 🆕 ДОБАВЛЕНО
          'project.canvases.*.metadata.createdAt', // 🆕 ДОБАВЛЕНО
          'project.canvases.*.metadata.updatedAt', // 🆕 ДОБАВЛЕНО
          'imageNodes.nodes', // ✅ ДОБАВЛЕНО - игнорируем все изображения
          'imageNodes.nodes.*.src', // ✅ ДОБАВЛЕНО - игнорируем base64 строки
        ],
      },
    })
    .concat(autoSaveMiddleware)
    .concat(projectSaveMiddleware) // 🆕 ДОБАВЛЕНО
    .concat(dateReviverMiddleware) // 🆕 ДОБАВЛЕНО
    .concat(canvasSyncMiddleware), // 🆕 ДОБАВЛЕНО

  devTools: process.env.NODE_ENV !== 'production',
})

// Типы
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Типизированные хуки
export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

// Вспомогательные селекторы
export const selectTodoNodes = (state: RootState) => state.todoNodes
export const selectViewport = (state: RootState) => state.viewport
export const selectCanvasDnd = (state: RootState) => state.canvasDnd
export const selectContextMenu = (state: RootState) => state.contextMenu
export const selectTodoForm = (state: RootState) => state.todoForm
export const selectProject = (state: RootState) => state.project // 🆕 ДОБАВЛЕНО
export const selectImageNodes = (state: RootState) => state.imageNodes // ✅ ДОБАВЛЕНО - селектор для изображений

// 🆕 Селектор для текущего проекта
export const selectCurrentProject = (state: RootState) => {
  const project = state.project;
  return project?.currentProjectId 
    ? project.projects?.[project.currentProjectId] 
    : null;
}

// 🆕 Селектор для текущей страницы
export const selectCurrentPage = (state: RootState) => {
  const project = state.project;
  const currentProject = project?.currentProjectId 
    ? project.projects?.[project.currentProjectId] 
    : null;
  
  if (!currentProject || !currentProject.currentPageId) return null;
  
  return project.pages?.[currentProject.currentPageId] || null;
}

// 🆕 Селектор для текущего полотна
export const selectCurrentCanvas = (state: RootState) => {
  const project = state.project;
  const currentProject = project?.currentProjectId 
    ? project.projects?.[project.currentProjectId] 
    : null;
  
  if (!currentProject || !currentProject.currentPageId) return null;
  
  const currentPage = project.pages?.[currentProject.currentPageId];
  if (!currentPage || !currentPage.canvasId) return null;
  
  return project.canvases?.[currentPage.canvasId] || null;
}

// 🆕 Селектор для ID нод текущего полотна
export const selectCurrentCanvasNodeIds = (state: RootState) => {
  const currentCanvas = selectCurrentCanvas(state);
  return currentCanvas?.nodes || [];
}

// 🆕 Селектор для viewport текущего полотна
export const selectCurrentCanvasViewport = (state: RootState) => {
  const currentCanvas = selectCurrentCanvas(state);
  return currentCanvas?.viewport || { x: 0, y: 0, zoom: 1 };
}

// 🆕 Селектор для сетки текущего полотна
export const selectCurrentCanvasGrid = (state: RootState) => {
  const currentCanvas = selectCurrentCanvas(state);
  return currentCanvas?.grid || { size: 20, color: '#e0e0e0', isVisible: true };
}

// 🆕 Селектор для фона текущего полотна
export const selectCurrentCanvasBackground = (state: RootState) => {
  const currentCanvas = selectCurrentCanvas(state);
  return currentCanvas?.background || '#f0f0f0';
}

// 🆕 Селектор для всех страниц текущего проекта
export const selectProjectPages = (state: RootState) => {
  const currentProject = selectCurrentProject(state);
  if (!currentProject) return [];
  
  return (currentProject.pageIds || [])
    .map(pageId => state.project.pages?.[pageId])
    .filter(Boolean)
    .sort((a: any, b: any) => (a.metadata?.order || 0) - (b.metadata?.order || 0));
}

// 🆕 Селектор для проекта по ID
export const selectProjectById = (projectId: string) => 
  (state: RootState) => state.project?.projects?.[projectId];

// 🆕 Селектор для страницы по ID
export const selectPageById = (pageId: string) => 
  (state: RootState) => state.project?.pages?.[pageId];

// 🆕 Селектор для полотна по ID страницы
export const selectCanvasByPageId = (pageId: string) => 
  (state: RootState) => {
    const page = state.project?.pages?.[pageId];
    if (!page?.canvasId) return null;
    return state.project?.canvases?.[page.canvasId] || null;
  };

// 🆕 Селектор для полотна по ID
export const selectCanvasById = (canvasId: string) => 
  (state: RootState) => state.project?.canvases?.[canvasId];

// Утилита для создания селекторов
export const createSelector = <T, R>(
  selector: (state: RootState) => T,
  transformer: (value: T) => R
) => {
  return (state: RootState) => transformer(selector(state))
}

// 🆕 Инициализация проекта при старте приложения
export const initializeProject = () => {
  return (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    
    // Если нет текущего проекта, создаем новый
    if (!state.project?.currentProjectId || Object.keys(state.project?.projects || {}).length === 0) {
      dispatch(require('@features/project-management/model/slice').createProject({ name: 'Мой Проект' }));
      console.log('🚀 Создан новый проект');
    } else {
      console.log('📂 Загружен существующий проект');
    }
  };
};

