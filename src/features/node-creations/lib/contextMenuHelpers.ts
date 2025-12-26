// src/features/context-menu/lib/contextMenuHelpers.ts
import { nanoid } from 'nanoid';
import { MenuItemData } from '../model/types';

export const createNodeContextMenu = (nodeId: string): MenuItemData[] => {
  return [
    {
      id: nanoid(),
      label: 'Редактировать',
      icon: '✏️',
      actionType: 'EDIT_NODE',
    },
    {
      id: nanoid(),
      label: 'Дублировать',
      icon: '📋',
      actionType: 'DUPLICATE_NODE',
    },
    { id: 'divider-1', id: 'divider' },
    {
      id: nanoid(),
      label: 'Статус: К выполнению',
      icon: '📝',
      actionType: 'SET_STATUS',
      payload: { status: 'todo' },
    },
    {
      id: nanoid(),
      label: 'Статус: В работе',
      icon: '⚡',
      actionType: 'SET_STATUS',
      payload: { status: 'in-progress' },
    },
    {
      id: nanoid(),
      label: 'Статус: Выполнено',
      icon: '✅',
      actionType: 'SET_STATUS',
      payload: { status: 'done' },
    },
    { id: 'divider-2', id: 'divider' },
    {
      id: nanoid(),
      label: 'Приоритет: Низкий',
      icon: '🟢',
      actionType: 'SET_PRIORITY',
      payload: { priority: 'low' },
    },
    {
      id: nanoid(),
      label: 'Приоритет: Средний',
      icon: '🟡',
      actionType: 'SET_PRIORITY',
      payload: { priority: 'medium' },
    },
    {
      id: nanoid(),
      label: 'Приоритет: Высокий',
      icon: '🟠',
      actionType: 'SET_PRIORITY',
      payload: { priority: 'high' },
    },
    {
      id: nanoid(),
      label: 'Приоритет: Критический',
      icon: '🔴',
      actionType: 'SET_PRIORITY',
      payload: { priority: 'critical' },
    },
    { id: 'divider-3', id: 'divider' },
    {
      id: nanoid(),
      label: 'Удалить',
      icon: '🗑️',
      actionType: 'DELETE_NODE',
    },
  ];
};

export const createCanvasContextMenu = (position: { x: number; y: number }): MenuItemData[] => {
  return [
    {
      id: nanoid(),
      label: 'Создать задачу здесь',
      icon: '➕',
      actionType: 'CREATE_TODO',
      payload: { position },
    },
  ];
};