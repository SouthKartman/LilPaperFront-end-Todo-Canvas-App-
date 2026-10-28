export interface FrameNode {
  id: string;
  type: 'frame';
  pageId: string;
  projectId?: string;
  /** Parent Frame; its position is then relative to that Frame. */
  parentFrameId?: string;
  name: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
  clipContent: boolean;
  zIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface FrameNodesState {
  nodes: Record<string, FrameNode>;
  ids: string[];
  selectedNodeIds: string[];
}


