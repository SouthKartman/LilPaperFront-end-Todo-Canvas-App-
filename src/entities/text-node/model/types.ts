export interface TextNodeData {
  id: string;
  type: 'text';
  pageId: string;
  parentFrameId?: string;
  text: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  fontSize: number;
  color: string;
  zIndex: number;
  createdAt: string;
  updatedAt: string;
}
