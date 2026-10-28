import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';
import type { FrameNode, FrameNodesState } from '@entities/frame/model/types';
import type { RootState } from '@shared/lib/state/store';

const initialState: FrameNodesState = { nodes: {}, ids: [], selectedNodeIds: [] };

const frameNodesSlice = createSlice({
  name: 'frameNodes', initialState,
  reducers: {
    createFrame: (state, action: PayloadAction<{ position: { x: number; y: number }; pageId: string; name?: string }>) => {
      const now = new Date().toISOString();
      const node: FrameNode = { id: `frame_${nanoid()}`, type: 'frame', pageId: action.payload.pageId, name: action.payload.name || 'Frame', position: action.payload.position, size: { width: 480, height: 320 }, fill: '#FFFFFF', stroke: '#A8A8A8', strokeWidth: 1, cornerRadius: 0, clipContent: false, zIndex: 0, createdAt: now, updatedAt: now };
      state.nodes[node.id] = node; state.ids.push(node.id);
    },
    importFrames: (state, action: PayloadAction<Record<string, FrameNode>>) => { Object.values(action.payload).forEach(node => { state.nodes[node.id] = node; if (!state.ids.includes(node.id)) state.ids.push(node.id); }); },
    updateFrame: (state, action: PayloadAction<{ id: string; updates: Partial<Omit<FrameNode, 'id' | 'type' | 'createdAt'>> }>) => { const frame = state.nodes[action.payload.id]; if (frame) Object.assign(frame, action.payload.updates, { updatedAt: new Date().toISOString() }); },
    moveFrame: (state, action: PayloadAction<{ id: string; position: { x: number; y: number }; parentFrameId?: string }>) => { const frame = state.nodes[action.payload.id]; if (frame) { frame.position = action.payload.position; if ('parentFrameId' in action.payload) frame.parentFrameId = action.payload.parentFrameId; frame.updatedAt = new Date().toISOString(); } },
    resizeFrame: (state, action: PayloadAction<{ id: string; size: { width: number; height: number }; position?: { x: number; y: number } }>) => { const frame = state.nodes[action.payload.id]; if (frame) { frame.size = action.payload.size; if (action.payload.position) frame.position = action.payload.position; frame.updatedAt = new Date().toISOString(); } },
    deleteFrame: (state, action: PayloadAction<string>) => { delete state.nodes[action.payload]; state.ids = state.ids.filter(id => id !== action.payload); state.selectedNodeIds = state.selectedNodeIds.filter(id => id !== action.payload); },
    selectFrame: (state, action: PayloadAction<string>) => { if (!state.selectedNodeIds.includes(action.payload)) state.selectedNodeIds.push(action.payload); },
    deselectFrame: (state, action: PayloadAction<string>) => { state.selectedNodeIds = state.selectedNodeIds.filter(id => id !== action.payload); },
    clearFrameSelection: state => { state.selectedNodeIds = []; },
  },
});

export const selectAllFrames = (state: RootState) => state.frameNodes.ids.map(id => state.frameNodes.nodes[id]).filter(Boolean);
export const selectSelectedFrameIds = (state: RootState) => state.frameNodes.selectedNodeIds;
export const { createFrame, importFrames, updateFrame, moveFrame, resizeFrame, deleteFrame, selectFrame, deselectFrame, clearFrameSelection } = frameNodesSlice.actions;
export default frameNodesSlice.reducer;
