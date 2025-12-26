// src/features/storage/model/autoSaveMiddleware.ts
import { Middleware } from '@reduxjs/toolkit';
import { TodoStorage } from '@shared/api/storage/jsonStorage/todoStorage';
import { RootState } from '@shared/lib/state/store';

// Действия, которые требуют автосохранения
const SAVE_ACTIONS = [
  'todoNodes/addNode',
  'todoNodes/updateNode',
  'todoNodes/deleteNode',
  'todoNodes/moveNode',
  'todoNodes/importNodes',
  'todoNodes/clearAllNodes',
];

export const autoSaveMiddleware: Middleware = store => next => action => {
  const result = next(action);
  
  // Если это действие требует сохранения
  if (SAVE_ACTIONS.includes(action.type)) {
    // Ждем следующего тика, чтобы состояние обновилось
    setTimeout(() => {
      const state = store.getState() as RootState;
      TodoStorage.saveTodos(state.todoNodes.nodes);
    }, 0);
  }
  
  return result;
};