import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';
import type { TextNodeData } from '@entities/text-node/model/types';
import type { RootState } from '@shared/lib/state/store';

type State = { nodes: Record<string, TextNodeData>; ids: string[]; selectedIds: string[] };
const initialState: State = { nodes: {}, ids: [], selectedIds: [] };
const slice = createSlice({ name: 'textNodes', initialState, reducers: {
  createText: (state, action: PayloadAction<{ pageId: string; position: { x: number; y: number }; size?: { width: number; height: number } }>) => {
    const now = new Date().toISOString(); const node: TextNodeData = { id: `text_${nanoid()}`, type: 'text', pageId: action.payload.pageId, text: '', position: action.payload.position, size: action.payload.size || { width: 240, height: 48 }, fontSize: 18, color: '#1f2937', zIndex: 2, createdAt: now, updatedAt: now };
    state.nodes[node.id] = node; state.ids.push(node.id); state.selectedIds = [node.id];
  },
  importTexts: (state, action: PayloadAction<Record<string, TextNodeData>>) => { Object.values(action.payload).forEach(node => { state.nodes[node.id] = node; if (!state.ids.includes(node.id)) state.ids.push(node.id); }); },
  updateText: (state, action: PayloadAction<{ id: string; updates: Partial<TextNodeData> }>) => { const node = state.nodes[action.payload.id]; if (node) Object.assign(node, action.payload.updates, { updatedAt: new Date().toISOString() }); },
  moveText: (state, action: PayloadAction<{ id: string; position: { x: number; y: number } }>) => { const node = state.nodes[action.payload.id]; if (node) { node.position = action.payload.position; node.updatedAt = new Date().toISOString(); } },
  deleteText: (state, action: PayloadAction<string>) => { delete state.nodes[action.payload]; state.ids = state.ids.filter(id => id !== action.payload); state.selectedIds = state.selectedIds.filter(id => id !== action.payload); },
  selectText: (state, action: PayloadAction<string>) => { if (!state.selectedIds.includes(action.payload)) state.selectedIds.push(action.payload); },
  clearTextSelection: state => { state.selectedIds = []; },
}});
export const selectAllTexts = (state: RootState) => state.textNodes.ids.map(id => state.textNodes.nodes[id]).filter(Boolean);
export const selectSelectedTextIds = (state: RootState) => state.textNodes.selectedIds;
export const { createText, importTexts, updateText, moveText, deleteText, selectText, clearTextSelection } = slice.actions;
export default slice.reducer;
