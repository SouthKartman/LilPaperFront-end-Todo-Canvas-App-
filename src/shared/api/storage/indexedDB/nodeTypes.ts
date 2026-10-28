export type StoredNodeType = 'todo' | 'image' | 'iframe' | 'frame' | 'text' | 'rectangle';

export interface DBNode {
  id: string;
  type: StoredNodeType;

  projectId: string;
  pageId: string;

  position: {
    x: number;
    y: number;
  };

  size: {
    width: number;
    height: number;
  };

  zIndex: number;
  data: Record<string, unknown>;

  createdAt: string;
  updatedAt: string;
}

/** Ключ записи в единой таблице, не меняющий ID узла в Redux. */
export function getStoredNodeId(
  type: StoredNodeType,
  originalId: string,
): string {
  return `${type}:${originalId}`;
}

/** Исходный ID, используемый приложением и Redux. */
export function getOriginalNodeId(node: DBNode): string {
  const storedPrefix = `${node.type}:`;

  if (node.id.startsWith(storedPrefix)) {
    return node.id.slice(storedPrefix.length);
  }

  // Поддержка записей, созданных до миграции.
  return String(node.data.id ?? node.id);
}
