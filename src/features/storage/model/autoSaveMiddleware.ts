import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '@shared/lib/state/store';
import { TodoIndexedDBStorage } from '@shared/api/storage/indexedDB/todoStorage';
import { ImageIndexedDBStorage } from '@shared/api/storage/indexedDB/imageStorage';
import { ProjectIndexedDBStorage } from '@shared/api/storage/indexedDB/projectStorage';

// Действия, которые требуют автосохранения todoNodes
const TODO_SAVE_ACTIONS = [
  'todoNodes/createTodo',
  'todoNodes/createTodoAtPosition',
  'todoNodes/createTodoForPage',
  'todoNodes/duplicateTodo',
  'todoNodes/updateTodo',
  'todoNodes/updateTodoPartial',
  'todoNodes/deleteTodo',
  'todoNodes/deleteSelectedTodos',
  'todoNodes/moveTodo',
  'todoNodes/resizeTodo',
  'todoNodes/setTodoStatus',
  'todoNodes/setTodoPriority',
  'todoNodes/addTodoTag',
  'todoNodes/removeTodoTag',
  'todoNodes/importNodes',
  'todoNodes/clearAllNodes',
];

// Действия для изображений
const IMAGE_SAVE_ACTIONS = [
  'imageNodes/addImageNode',
  'imageNodes/addImageNodes',
  'imageNodes/updateImageNode',
  'imageNodes/moveImageNode',
  'imageNodes/resizeImageNode',
  'imageNodes/setImageZIndex',
  'imageNodes/deleteImageNode',
  'imageNodes/deleteImageNodes',
  'imageNodes/clearAllImages',
  'imageNodes/importImages',
];

// Действия для проекта
const PROJECT_SAVE_ACTIONS = [
  'project/createProject',
  'project/addPage',
  'project/switchPage',
  'project/setPageName',
  'project/removePage',
  'project/reorderPages',
  'project/addNodeToCanvas',
  'project/removeNodeFromCanvas',
  'project/moveNodeBetweenCanvases',
  'project/setCurrentProject',
  'project/updateProjectName',
  'project/deleteProject',
  'project/updateCanvas',
  'project/loadProjectState',
];

// Дебаунс очередь для избежания частых сохранений
const saveQueue: Map<string, NodeJS.Timeout> = new Map();

export const autoSaveMiddleware: Middleware = store => next => action => {
  const result = next(action);
  
  const state = store.getState() as RootState;

  // Сохраняем todoNodes в IndexedDB
  if (TODO_SAVE_ACTIONS.includes(action.type)) {
    // Отменяем предыдущий таймер
    if (saveQueue.has('todos')) {
      clearTimeout(saveQueue.get('todos'));
    }
    
    // Устанавливаем новый таймер с дебаунсом 1 секунда
    const timeout = setTimeout(async () => {
      try {
        const todoNodes = state.todoNodes?.nodes;
        if (todoNodes && Object.keys(todoNodes).length > 0) {
          await TodoIndexedDBStorage.saveTodos(todoNodes);
          console.log(`💾 Автосохранение ${Object.keys(todoNodes).length} задач в IndexedDB`);
        }
      } catch (error) {
        console.error('❌ Ошибка автосохранения todoNodes в IndexedDB:', error);
        // Пробуем сохранить в localStorage как fallback
        try {
          const { TodoStorage } = await import('@shared/api/storage/jsonStorage/todoStorage');
          TodoStorage.saveTodos(state.todoNodes.nodes);
        } catch (fallbackError) {
          console.error('❌ Критическая ошибка сохранения:', fallbackError);
        }
      } finally {
        saveQueue.delete('todos');
      }
    }, 1000);
    
    saveQueue.set('todos', timeout);
  }
  
  // Сохраняем изображения в IndexedDB
  if (IMAGE_SAVE_ACTIONS.includes(action.type)) {
    if (saveQueue.has('images')) {
      clearTimeout(saveQueue.get('images'));
    }
    
    const timeout = setTimeout(async () => {
      try {
        const imageNodes = state.imageNodes?.nodes;
        if (imageNodes && Object.keys(imageNodes).length > 0) {
          await ImageIndexedDBStorage.saveImages(imageNodes);
          console.log(`🖼️ Автосохранение ${Object.keys(imageNodes).length} изображений в IndexedDB`);
        }
      } catch (error) {
        console.error('❌ Ошибка автосохранения изображений в IndexedDB:', error);
        // Пробуем сохранить в localStorage как fallback
        try {
          const { ImageStorage } = await import('@shared/api/storage/jsonStorage/imageStorage');
          ImageStorage.saveImages(state.imageNodes.nodes);
          console.log('🖼️ Сохранено в localStorage как fallback');
        } catch (fallbackError) {
          console.error('❌ Критическая ошибка сохранения изображений:', fallbackError);
        }
      } finally {
        saveQueue.delete('images');
      }
    }, 1000);
    
    saveQueue.set('images', timeout);
  }
  
  // Сохраняем проект в IndexedDB
  if (PROJECT_SAVE_ACTIONS.includes(action.type)) {
    if (saveQueue.has('project')) {
      clearTimeout(saveQueue.get('project'));
    }
    
    const timeout = setTimeout(async () => {
      try {
        const projectState = {
          currentProjectId: state.project?.currentProjectId,
          projects: state.project?.projects || {},
          pages: state.project?.pages || {},
          canvases: state.project?.canvases || {},
          metadata: {
            savedAt: new Date().toISOString(),
            version: '2.0',
          },
        };
        
        await ProjectIndexedDBStorage.saveProject(projectState);
        console.log('📁 Автосохранение проекта в IndexedDB');
      } catch (error) {
        console.error('❌ Ошибка автосохранения проекта в IndexedDB:', error);
        // Fallback на localStorage
        try {
          localStorage.setItem('project_state', JSON.stringify({
            currentProjectId: state.project?.currentProjectId,
            projects: state.project?.projects || {},
            pages: state.project?.pages || {},
            canvases: state.project?.canvases || {},
            metadata: {
              savedAt: new Date().toISOString(),
              version: '1.1',
            },
          }));
          console.log('📁 Сохранено в localStorage как fallback');
        } catch (fallbackError) {
          console.error('❌ Критическая ошибка сохранения проекта:', fallbackError);
        }
      } finally {
        saveQueue.delete('project');
      }
    }, 1000);
    
    saveQueue.set('project', timeout);
  }
  
  return result;
};