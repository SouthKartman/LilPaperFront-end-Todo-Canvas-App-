
import type { Todo } from '@entities/todo/model/types';
import type { ImageNode } from '@entities/image/model/types';
import type { DBNode } from './nodeTypes';

/**
 * Преобразует Todo в формат единого хранилища.
 * Исходный объект целиком сохраняется в data.
 */
export function todoToDBNode(
  todo: Todo,
  projectId: string,
): DBNode {
  const now = new Date().toISOString();

  return {
    id: todo.id,
    type: 'todo',
    projectId,
    pageId: todo.pageId,
    position: { ...todo.position },
    size: { ...todo.size },
    zIndex: 1,
    data: { ...todo },
    createdAt: todo.createdAt || now,
    updatedAt: todo.updatedAt || now,
  };
}

/**
 * Преобразует ImageNode в формат единого хранилища.
 * Файл изображения остаётся в fileStorage;
 * здесь сохраняются только его метаданные и filePath.
 */
export function imageToDBNode(
  image: ImageNode,
  projectId: string,
  pageId: string,
): DBNode {
  const now = new Date().toISOString();

  return {
    id: image.id,
    type: 'image',
    projectId,
    pageId,
    position: { ...image.position },
    size: { ...image.size },
    zIndex: image.zIndex ?? 1,
    data: { ...image },
    createdAt: image.createdAt || now,
    updatedAt: image.updatedAt || now,
  };
}
