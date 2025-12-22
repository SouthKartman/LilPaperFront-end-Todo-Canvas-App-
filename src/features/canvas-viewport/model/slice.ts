// src/features/canvas-viewport/model/slice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface ViewportTransform {
  x: number
  y: number
  zoom: number
}

interface CanvasViewportState {
  transform: ViewportTransform
  isPanning: boolean
}

const initialState: CanvasViewportState = {
  transform: {
    x: 0,
    y: 0,
    zoom: 1,
  },
  isPanning: false,
}

export const canvasViewportSlice = createSlice({
  name: 'canvasViewport',
  initialState,
  reducers: {
    setTransform: (state, action: PayloadAction<Partial<ViewportTransform>>) => {
      state.transform = { ...state.transform, ...action.payload }
    },
    resetViewport: (state) => {
      state.transform = initialState.transform
    },
    setPanning: (state, action: PayloadAction<boolean>) => {
      state.isPanning = action.payload
    },
  },
})

export const { setTransform, resetViewport, setPanning } = canvasViewportSlice.actions
export default canvasViewportSlice.reducer