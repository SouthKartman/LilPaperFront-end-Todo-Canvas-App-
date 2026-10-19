import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '@shared/lib/state/store';
import { addNodeToCanvas, removeNodeFromCanvas } from '@features/project-management/model/slice';

type NodeWithPage = { id: string; pageId?: string };

const canvasIdForPage = (state: RootState, pageId?: string) =>
  pageId ? state.project.pages[pageId]?.canvasId : undefined;

const nodeIdsAddedByAction = (
  before: Record<string, unknown>,
  after: Record<string, unknown>,
) => Object.keys(after).filter(id => !(id in before));

/**
 * Keeps a node slice and Canvas.nodes in sync. The node's own pageId is the
 * source of truth: using the current page here is wrong when a page changes
 * while an upload or another async create operation is completing.
 */
export const canvasSyncMiddleware: Middleware = store => next => action => {
  const previous = store.getState() as RootState;
  const type = (action as { type?: string }).type ?? '';
  const payload = (action as { payload?: unknown }).payload;

  const deleted: NodeWithPage[] = [];
  const rememberDeleted = (nodes: Record<string, NodeWithPage>, ids: string[]) => {
    ids.forEach(id => {
      const node = nodes[id];
      if (node) deleted.push(node);
    });
  };

  if (type === 'todoNodes/deleteTodo' && typeof payload === 'string') {
    rememberDeleted(previous.todoNodes.nodes, [payload]);
  } else if (type === 'todoNodes/deleteSelectedTodos') {
    rememberDeleted(previous.todoNodes.nodes, previous.todoNodes.selectedNodeIds);
  } else if (type === 'imageNodes/deleteImageNode' && typeof payload === 'string') {
    rememberDeleted(previous.imageNodes.nodes, [payload]);
  } else if (type === 'imageNodes/deleteImageNodes' && Array.isArray(payload)) {
    rememberDeleted(previous.imageNodes.nodes, payload.filter((id): id is string => typeof id === 'string'));
  } else if (type === 'pluginNodes/deletePluginNode' && typeof payload === 'string') {
    rememberDeleted(previous.pluginNodes.nodes, [payload]);
  } else if (type === 'pluginNodes/deleteMultiplePluginNodes' && Array.isArray(payload)) {
    rememberDeleted(previous.pluginNodes.nodes, payload.filter((id): id is string => typeof id === 'string'));
  }

  const result = next(action);
  const current = store.getState() as RootState;
  const created: NodeWithPage[] = [];

  if (type === 'todoNodes/createTodo' || type === 'todoNodes/createTodoAtPosition' || type === 'todoNodes/createTodoForPage') {
    nodeIdsAddedByAction(previous.todoNodes.nodes, current.todoNodes.nodes)
      .map(id => current.todoNodes.nodes[id])
      .filter(Boolean)
      .forEach(node => created.push(node));
  } else if (type === 'imageNodes/addImageNode') {
    const node = payload as NodeWithPage;
    if (node?.id && current.imageNodes.nodes[node.id]) created.push(current.imageNodes.nodes[node.id]);
  } else if (type === 'imageNodes/addImageNodes' && Array.isArray(payload)) {
    payload.forEach(node => {
      if (node && typeof node === 'object' && 'id' in node) {
        const id = (node as NodeWithPage).id;
        if (current.imageNodes.nodes[id]) created.push(current.imageNodes.nodes[id]);
      }
    });
  } else if (type === 'pluginNodes/addPluginNode') {
    const node = payload as NodeWithPage;
    if (node?.id && current.pluginNodes.nodes[node.id]) created.push(current.pluginNodes.nodes[node.id]);
  }

  created.forEach(node => {
    const canvasId = canvasIdForPage(current, node.pageId);
    if (canvasId) store.dispatch(addNodeToCanvas({ canvasId, nodeId: node.id }));
  });

  deleted.forEach(node => {
    const canvasId = canvasIdForPage(previous, node.pageId);
    if (canvasId) store.dispatch(removeNodeFromCanvas({ canvasId, nodeId: node.id }));
  });

  return result;
};
