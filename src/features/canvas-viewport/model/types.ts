export interface ViewportTransform {
  x: number
  y: number
  zoom: number
  minZoom: number
  maxZoom: number
}

export interface ViewportState {
  transform: ViewportTransform
  isPanning: boolean
}