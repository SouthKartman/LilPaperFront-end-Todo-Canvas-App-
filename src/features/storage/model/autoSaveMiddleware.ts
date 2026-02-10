// src/features/storage/model/autoSaveMiddleware.ts
import { Middleware } from '@reduxjs/toolkit';
import { TodoStorage } from '@shared/api/storage/jsonStorage/todoStorage';
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

// 🆕 Действия, которые требуют автосохранения проекта и полотен
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

  // 🆕 Сохраняем todoNodes
  if (TODO_SAVE_ACTIONS.includes(action.type)) {
    setTimeout(() => {
      try {
        const nodesToSave = JSON.parse(JSON.stringify(state.todoNodes.nodes));
        TodoStorage.saveTodos(nodesToSave);
        console.log(`💾 Автосохранение ${Object.keys(nodesToSave).length} todoNodes`);
      } catch (error) {
        console.error('❌ Ошибка автосохранения todoNodes:', error);
      }
    }, 0);
  }
  
  // 🆕 Сохраняем проект и полотна
  if (PROJECT_SAVE_ACTIONS.includes(action.type)) {
    setTimeout(() => {
      try {
        // Сохраняем все состояние проекта
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
        
        // Сериализуем с обработкой Date объектов
        const serializedState = JSON.stringify(projectState, (key, value) => {
          if (value instanceof Date) {
            return { __type: 'Date', value: value.toISOString() };
          }
          return value;
        });
        
        localStorage.setItem('project_state', serializedState);
        
        const pageCount = Object.keys(state.project.pages).length;
        const canvasCount = Object.keys(state.project.canvases || {}).length;
        console.log(`💾 Автосохранение проекта: ${pageCount} страниц, ${canvasCount} полотен`);
      } catch (error) {
        console.error('❌ Ошибка автосохранения проекта:', error);
      }
    }, 0);
  }
  
  return result;
};