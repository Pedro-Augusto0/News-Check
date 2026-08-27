import { create } from 'zustand'
import type { ReviewDrawMode, ReviewStatus, ReviewWorkMode } from '../model'

const STORAGE_PREFIX = 'feature-crops.review-queue.v2.'

function storageKey(editionId: string): string {
  return `${STORAGE_PREFIX}${editionId}`
}

function loadStatuses(editionId: string): Record<string, ReviewStatus> {
  try {
    const raw = localStorage.getItem(storageKey(editionId))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as { statuses?: Record<string, ReviewStatus> }
    return parsed.statuses ?? {}
  } catch {
    return {}
  }
}

function saveStatuses(editionId: string, statuses: Record<string, ReviewStatus>) {
  try {
    localStorage.setItem(storageKey(editionId), JSON.stringify({ statuses }))
  } catch {
    // ignore quota / private mode
  }
}

interface UndoEntry {
  itemId: string
  previous: ReviewStatus
}

interface ReviewQueueState {
  editionId: string | null
  currentId: string | null
  inspectId: string | null
  statuses: Record<string, ReviewStatus>
  clientOnly: boolean
  workMode: ReviewWorkMode
  drawMode: ReviewDrawMode
  activeCropIndex: number
  undoStack: UndoEntry[]

  hydrateEdition: (editionId: string) => void
  setCurrentId: (id: string | null) => void
  setInspectId: (id: string | null) => void
  setClientOnly: (value: boolean) => void
  toggleClientOnly: () => void
  setWorkMode: (mode: ReviewWorkMode) => void
  setDrawMode: (mode: ReviewDrawMode) => void
  setActiveCropIndex: (index: number) => void
  markStatus: (itemId: string, status: ReviewStatus) => void
  undo: () => void
}

export const useReviewQueueStore = create<ReviewQueueState>((set, get) => ({
  editionId: null,
  currentId: null,
  inspectId: null,
  statuses: {},
  clientOnly: false,
  workMode: 'free',
  drawMode: 'off',
  activeCropIndex: 0,
  undoStack: [],

  hydrateEdition: (editionId) => {
    if (get().editionId === editionId) return
    set({
      editionId,
      statuses: loadStatuses(editionId),
      currentId: null,
      inspectId: null,
      workMode: 'free',
      drawMode: 'off',
      activeCropIndex: 0,
      undoStack: [],
    })
  },

  setCurrentId: (id) =>
    set({
      currentId: id,
      inspectId: null,
      drawMode: 'off',
      activeCropIndex: 0,
    }),

  setInspectId: (id) => set({ inspectId: id }),

  setClientOnly: (value) => set({ clientOnly: value }),

  toggleClientOnly: () => set((state) => ({ clientOnly: !state.clientOnly })),

  setWorkMode: (mode) => set({ workMode: mode, inspectId: null }),

  setDrawMode: (mode) => set({ drawMode: mode }),

  setActiveCropIndex: (index) => set({ activeCropIndex: Math.max(0, index) }),

  markStatus: (itemId, status) => {
    const { editionId, statuses } = get()
    const previous = statuses[itemId] ?? 'pending'
    if (previous === status) return
    const next = { ...statuses, [itemId]: status }
    if (editionId) saveStatuses(editionId, next)
    set((state) => ({
      statuses: next,
      undoStack: [...state.undoStack, { itemId, previous }].slice(-40),
      drawMode: 'off',
    }))
  },

  undo: () => {
    const { editionId, undoStack, statuses } = get()
    const last = undoStack[undoStack.length - 1]
    if (!last) return
    const nextStatuses = { ...statuses }
    if (last.previous === 'pending') delete nextStatuses[last.itemId]
    else nextStatuses[last.itemId] = last.previous
    if (editionId) saveStatuses(editionId, nextStatuses)
    set({
      statuses: nextStatuses,
      undoStack: undoStack.slice(0, -1),
      currentId: last.itemId,
      drawMode: 'off',
    })
  },
}))
