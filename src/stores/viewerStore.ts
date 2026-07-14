import { create } from 'zustand'

interface ViewerState {
  zoom: number
  panOffset: { x: number; y: number }
  panMode: boolean
  isRendering: boolean

  setZoom: (zoom: number) => void
  zoomIn: () => void
  zoomOut: () => void
  resetView: () => void
  setPanOffset: (offset: { x: number; y: number }) => void
  togglePanMode: () => void
  enterPanMode: () => void
  exitPanMode: () => void
  setRendering: (rendering: boolean) => void
}

const MIN_ZOOM = 0.5
const MAX_ZOOM = 4
const ZOOM_STEP = 0.25

export const useViewerStore = create<ViewerState>((set, get) => ({
  zoom: 1,
  panOffset: { x: 0, y: 0 },
  panMode: false,
  isRendering: false,

  setZoom: (zoom) => set({ zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)) }),
  zoomIn: () => get().setZoom(get().zoom + ZOOM_STEP),
  zoomOut: () => get().setZoom(get().zoom - ZOOM_STEP),
  resetView: () => set({ zoom: 1, panOffset: { x: 0, y: 0 } }),
  setPanOffset: (panOffset) => set({ panOffset }),
  togglePanMode: () => set((s) => ({ panMode: !s.panMode })),
  enterPanMode: () => set({ panMode: true }),
  exitPanMode: () => set({ panMode: false }),
  setRendering: (isRendering) => set({ isRendering }),
}))
