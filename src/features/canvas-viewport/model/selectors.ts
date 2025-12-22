// src/features/canvas-viewport/model/selectors.ts
import { RootState } from '@shared/lib/state/store'

export const selectViewportTransform = (state: RootState) => 
  state.canvasViewport.transform

export const selectIsPanning = (state: RootState) => 
  state.canvasViewport.isPanning