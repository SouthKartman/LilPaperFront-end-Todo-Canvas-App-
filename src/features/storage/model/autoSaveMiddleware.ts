// src/features/storage/model/autoSaveMiddleware.ts
import { Middleware } from '@reduxjs/toolkit';
import { TodoStorage } from '@shared/api/storage/jsonStorage/todoStorage';
import { ImageStorage } from '@shared/api/storage/jsonStorage/imageStorage'; // 🆕 Импортируем
import { RootState } from '@shared/lib/state/store';

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

// 🆕 Действия для изображений
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
];

export const autoSaveMiddleware: Middleware = store => next => action => {
  const result = next(action);
  
  const state = store.getState() as RootState;

  // Сохраняем todoNodes
  if (TODO_SAVE_ACTIONS.includes(action.type)) {
    setTimeout(() => {
      try {
        TodoStorage.saveTodos(state.todoNodes.nodes);
      } catch (error) {
        console.error('❌ Ошибка автосохранения todoNodes:', error);
      }
    }, 0);
  }
  
  // 🆕 Сохраняем изображения
  if (IMAGE_SAVE_ACTIONS.includes(action.type)) {
    setTimeout(() => {
      try {
        ImageStorage.saveImages(state.imageNodes.nodes);
        console.log(`🖼️ Автосохранение ${Object.keys(state.imageNodes.nodes).length} изображений`);
      } catch (error) {
        console.error('❌ Ошибка автосохранения изображений:', error);
      }
    }, 0);
  }
  
  // Сохраняем проект
  if (PROJECT_SAVE_ACTIONS.includes(action.type)) {
    setTimeout(() => {
      try {
        const projectState = {
          currentProjectId: state.project.currentProjectId,
          projects: state.project.projects,
          pages: state.project.pages,
          canvases: state.project.canvases || {},
          metadata: {
            savedAt: new Date().toISOString(),
            version: '1.1',
          },
        };
        
        localStorage.setItem('project_state', JSON.stringify(projectState));
      } catch (error) {
        console.error('❌ Ошибка автосохранения проекта:', error);
      }
    }, 0);
  }
  
  return result;
};