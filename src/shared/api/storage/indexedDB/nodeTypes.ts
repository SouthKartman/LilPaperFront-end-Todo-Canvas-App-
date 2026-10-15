
export type StoredNodeType =
  | 'todo'
  | 'image'
  | 'iframe';

export interface DBNode {
  id: string;

  /** Тип ноды в едином хранилище, а не визуальный подтип задачи. */
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
