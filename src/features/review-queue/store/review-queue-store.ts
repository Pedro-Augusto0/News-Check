import { create } from 'zustand'
import type { ReviewDrawMode, ReviewStatus, ReviewWorkMode } from '../model'

const STORAGE_PREFIX = 'feature-crops.review-queue.v2.'

function storageKey(editionId: string): string {
  return `${STORAGE_PREFIX}${editionId}`
}

function loadPersisted(editionId: string): {
  statuses: Record<string, ReviewStatus>
  savedIds: Record<string, true>
} {
  try {
    const raw = localStorage.getItem(storageKey(editionId))
    if (!raw) return { statuses: {}, savedIds: {} }
    const parsed = JSON.parse(raw) as {
      statuses?: Record<string, ReviewStatus>
      savedIds?: Record<string, true>
    }
    return { statuses: parsed.statuses ?? {}, savedIds: parsed.savedIds ?? {} }
  } catch {
    return { statuses: {}, savedIds: {} }
  }
}

function savePersisted(
  editionId: string,
  statuses: Record<string, ReviewStatus>,
  savedIds: Record<string, true>,
) {
  try {
    localStorage.setItem(storageKey(editionId), JSON.stringify({ statuses, savedIds }))
  } catch {
    // ignore quota / private mode
  }
}

interface UndoEntry {
  itemId: string
  previous: ReviewStatus
}

function reviewQueueIdForNews(newsId: string): string {
  return `news:${newsId}`
}

interface ReviewQueueState {
  editionId: string | null
  currentId: string | null
  inspectId: string | null
  statuses: Record<string, ReviewStatus>
  savedIds: Record<string, true>
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
  markSaved: (itemId: string) => void
  clearStatus: (itemId: string) => void
  seedDoneFromApi: (editionId: string, newsIds: string[]) => void
  undo: () => void
}

export const useReviewQueueStore = create<ReviewQueueState>((set, get) => ({
  editionId: null,
  currentId: null,
  inspectId: null,
  statuses: {},
  savedIds: {},
  clientOnly: false,
  workMode: 'free',
  drawMode: 'off',
  activeCropIndex: 0,
  undoStack: [],

  hydrateEdition: (editionId) => {
    if (get().editionId === editionId) return
    const persisted = loadPersisted(editionId)
    set({
      editionId,
      statuses: persisted.statuses,
      savedIds: persisted.savedIds,
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
    const { editionId, statuses, savedIds } = get()
    const previous = statuses[itemId] ?? 'pending'
    if (previous === status) return
    const next = { ...statuses, [itemId]: status }
    if (editionId) savePersisted(editionId, next, savedIds)
    set((state) => ({
      statuses: next,
      undoStack: [...state.undoStack, { itemId, previous }].slice(-40),
      drawMode: 'off',
    }))
  },

  markSaved: (itemId) => {
    const { editionId, statuses, savedIds } = get()
    if (savedIds[itemId]) return
    const nextSavedIds = { ...savedIds, [itemId]: true as const }
    if (editionId) savePersisted(editionId, statuses, nextSavedIds)
    set({ savedIds: nextSavedIds })
  },

  clearStatus: (itemId) => {
    const { editionId, statuses, savedIds } = get()
    if (!statuses[itemId]) return
    const next = { ...statuses }
    delete next[itemId]
    if (editionId) savePersisted(editionId, next, savedIds)
    set({ statuses: next })
  },

  seedDoneFromApi: (editionId, newsIds) => {
    if (newsIds.length === 0) return
    const persisted = loadPersisted(editionId)
    const statuses = {
      ...(get().editionId === editionId ? get().statuses : persisted.statuses),
    }
    const savedIds = {
      ...(get().editionId === editionId ? get().savedIds : persisted.savedIds),
    }
    let changed = false

    for (const newsId of newsIds) {
      const itemId = reviewQueueIdForNews(newsId)
      if (statuses[itemId] !== 'approved') {
        statuses[itemId] = 'approved'
        changed = true
      }
      if (!savedIds[itemId]) {
        savedIds[itemId] = true
        changed = true
      }
    }

    if (!changed) return
    savePersisted(editionId, statuses, savedIds)
    if (get().editionId === editionId) {
      set({ statuses, savedIds })
    }
  },

  undo: () => {
    const { editionId, undoStack, statuses, savedIds } = get()
    const last = undoStack[undoStack.length - 1]
    if (!last) return
    const nextStatuses = { ...statuses }
    const nextSavedIds = { ...savedIds }
    if (last.previous === 'pending') delete nextStatuses[last.itemId]
    else nextStatuses[last.itemId] = last.previous
    delete nextSavedIds[last.itemId]
    if (editionId) savePersisted(editionId, nextStatuses, nextSavedIds)
    set({
      statuses: nextStatuses,
      savedIds: nextSavedIds,
      undoStack: undoStack.slice(0, -1),
      currentId: last.itemId,
      drawMode: 'off',
    })
  },
}))
