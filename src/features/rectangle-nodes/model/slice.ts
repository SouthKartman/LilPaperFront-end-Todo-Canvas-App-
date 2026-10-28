import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';
import type { RectangleNode } from '@entities/rectangle/model/types';
import type { RootState } from '@shared/lib/state/store';
type State = { nodes: Record<string, RectangleNode>; ids: string[]; selectedIds: string[] };
const initialState: State = { nodes: {}, ids: [], selectedIds: [] };
const slice = createSlice({ name: 'rectangleNodes', initialState, reducers: {
  createRectangle: (state, action: PayloadAction<{ pageId: string; position: { x: number; y: number } }>) => { const now = new Date().toISOString(); const node: RectangleNode = { id: `rect_${nanoid()}`, type: 'rectangle', pageId: action.payload.pageId, position: action.payload.position, size: { width: 240, height: 160 }, fill: '#D9D9D9', cornerRadius: 0, zIndex: 1, createdAt: now, updatedAt: now }; state.nodes[node.id] = node; state.ids.push(node.id); state.selectedIds = [node.id]; },
  importRectangles: (state, action: PayloadAction<Record<string, RectangleNode>>) => { Object.values(action.payload).forEach(node => { state.nodes[node.id] = node; if (!state.ids.includes(node.id)) state.ids.push(node.id); }); },
  updateRectangle: (state, action: PayloadAction<{ id: string; updates: Partial<RectangleNode> }>) => { const node = state.nodes[action.payload.id]; if (node) Object.assign(node, action.payload.updates, { updatedAt: new Date().toISOString() }); },
  deleteRectangle: (state, action: PayloadAction<string>) => { delete state.nodes[action.payload]; state.ids = state.ids.filter(id => id !== action.payload); state.selectedIds = state.selectedIds.filter(id => id !== action.payload); },
  selectRectangle: (state, action: PayloadAction<string>) => { if (!state.selectedIds.includes(action.payload)) state.selectedIds.push(action.payload); }, clearRectangleSelection: state => { state.selectedIds = []; },
}});
export const selectAllRectangles = (state: RootState) => state.rectangleNodes.ids.map(id => state.rectangleNodes.nodes[id]).filter(Boolean);
export const selectSelectedRectangleIds = (state: RootState) => state.rectangleNodes.selectedIds;
export const { createRectangle, importRectangles, updateRectangle, deleteRectangle, selectRectangle, clearRectangleSelection } = slice.actions; export default slice.reducer;
