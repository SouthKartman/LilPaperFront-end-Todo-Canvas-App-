// src/features/canvas-dnd/model/slice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { CanvasDndState } from './types'

const initialState: CanvasDndState = {
  drag: {
    isDragging: false,
    draggedNodeId: null,
    startPosition: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 },
    offset: { x: 0, y: 0 },
  },
  dropZones: [],
}

export const canvasDndSlice = createSlice({
  name: 'canvasDnd',
  initialState,
  reducers: {
    startDrag: (
      state,
      action: PayloadAction<{
        nodeId: string
        startX: number
        startY: number
        offsetX: number
        offsetY: number
      }>
    ) => {
      const { nodeId, startX, startY, offsetX, offsetY } = action.payload
      state.drag = {
        isDragging: true,
        draggedNodeId: nodeId,
        startPosition: { x: startX, y: startY },
        currentPosition: { x: startX, y: startY },
        offset: { x: offsetX, y: offsetY },
      }
    },

    updateDrag: (
      state,
      action: PayloadAction<{ x: number; y: number }>
    ) => {
      if (state.drag.isDragging) {
        state.drag.currentPosition = action.payload
      }
    },

    endDrag: (state) => {
      state.drag = {
        isDragging: false,
        draggedNodeId: null,
        startPosition: { x: 0, y: 0 },
        currentPosition: { x: 0, y: 0 },
        offset: { x: 0, y: 0 },
      }
    },

    addDropZone: (
      state,
      action: PayloadAction<{
        id: string
        x: number
        y: number
        width: number
        height: number
      }>
    ) => {
      state.dropZones.push(action.payload)
    },

    removeDropZone: (state, action: PayloadAction<string>) => {
      state.dropZones = state.dropZones.filter(zone => zone.id !== action.payload)
    },

    clearDropZones: (state) => {
      state.dropZones = []
    },
  },
})

export const {
  startDrag,
  updateDrag,
  endDrag,
  addDropZone,
  removeDropZone,
  clearDropZones,
} = canvasDndSlice.actions

export default canvasDndSlice.reducer