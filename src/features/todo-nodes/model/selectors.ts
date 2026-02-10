// src/features/todo-nodes/model/selectors.ts
import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '@shared/lib/state/store';

// Базовые селекторы
export const selectAllTodoNodes = (state: RootState) => {
  return Object.values(state.todoNodes.nodes);
};

export const selectTodoNodeById = (state: RootState, nodeId: string) => {
  return state.todoNodes.nodes[nodeId];
};

export const selectSelectedTodoNodes = (state: RootState) => {
  return state.todoNodes.selectedNodeIds
    .map(id => state.todoNodes.nodes[id])
    .filter(Boolean);
};

export const selectEditingTodoNode = (state: RootState) => {
  if (state.todoNodes.editingNodeId) {
    return state.todoNodes.nodes[state.todoNodes.editingNodeId];
  }
  return null;
};

export const selectTodoNodesByStatus = (state: RootState, status: string) => {
  return Object.values(state.todoNodes.nodes).filter(node => node.status === status);
};

export const selectTodoNodesByPriority = (state: RootState, priority: string) => {
  return Object.values(state.todoNodes.nodes).filter(node => node.priority === priority);
};

// 🆕 НОВЫЕ СЕЛЕКТОРЫ ДЛЯ РАБОТЫ СО СТРАНИЦАМИ

// Селектор для нод текущей страницы
export const selectCurrentPageNodes = createSelector(
  [
    (state: RootState) => state.todoNodes.nodes,
    (state: RootState) => state.todoNodes.allIds || Object.keys(state.todoNodes.nodes),
    (state: RootState) => state.project?.currentPageId,
  ],
  (nodes, allIds, currentPageId) => {
    if (!currentPageId) return [];
    
    return allIds
      .map(id => nodes[id])
      .filter(node => node && node.pageId === currentPageId);
  }
);

// Селектор для нод конкретной страницы
export const selectNodesByPageId = (pageId: string) => 
  (state: RootState) => {
    return Object.values(state.todoNodes.nodes)
      .filter(node => node.pageId === pageId);
  };

// Селектор для подсчета нод на странице
export const selectNodeCountByPageId = (pageId: string) => 
  (state: RootState) => {
    return Object.values(state.todoNodes.nodes)
      .filter(node => node.pageId === pageId)
      .length;
  };

// Комбинированный селектор: ноды текущей страницы с фильтрацией
export const selectFilteredCurrentPageNodes = createSelector(
  [
    selectCurrentPageNodes,
    (state: RootState) => state.todoNodes.selectedNodeIds,
    (state: RootState) => state.todoNodes.editingNodeId,
  ],
  (currentPageNodes, selectedNodeIds, editingNodeId) => {
    return {
      nodes: currentPageNodes,
      selectedNodeIds,
      editingNodeId,
      totalCount: currentPageNodes.length,
      selectedCount: currentPageNodes.filter(node => 
        selectedNodeIds.includes(node.id)
      ).length,
    };
  }
);

// Селектор для статистики по страницам
export const selectPageNodesStats = createSelector(
  [
    (state: RootState) => state.todoNodes.nodes,
    (state: RootState) => state.project?.pages || {},
  ],
  (nodes, pages) => {
    const stats: Record<string, {
      total: number;
      completed: number;
      pending: number;
    }> = {};
    
    // Инициализируем статистику для всех страниц
    Object.values(pages).forEach(page => {
      stats[page.id] = {
        total: 0,
        completed: 0,
        pending: 0,
      };
    });
    
    // Считаем статистику
    Object.values(nodes).forEach(node => {
      if (node.pageId && stats[node.pageId]) {
        stats[node.pageId].total++;
        if (node.status === 'completed') {
          stats[node.pageId].completed++;
        } else {
          stats[node.pageId].pending++;
        }
      }
    });
    
    return stats;
  }
);