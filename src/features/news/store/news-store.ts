import { create } from 'zustand'
import {
  consolidateNewsAfterCropMerge,
  deleteManualNewsItem,
  ensureNewsForCrop,
  findNewsByCropId,
  openNewsTextModal,
  registerNewsStore,
  splitNewsForUngroupedCrop,
  syncNewsCropLink,
} from '@/features/crop-news-linking/crop-news-coordinator'
import { pageScopeKey } from '@/features/page-navigation/page-key'
import {
  removeNewsIdsFromHighlights,
  resolveHighlightScope,
  setPageHighlights,
} from './highlights'
import { createManualNewsItem } from './manual-items'
import {
  loadPersistedNews as loadPersisted,
  savePersistedNews as savePersisted,
} from './persistence'
import type { NewsState } from './state-types'
import {
  buildItemsFromApi,
  mergeManualPersistedItems,
} from './transformations'

export type { NewsHighlightScope, NewsPageHighlightMap } from './state-types'

export const useNewsStore = create<NewsState>((set, get) => ({
  items: {},
  selectedNewsItemId: null,
  highlightedNewsByPage: {},
  isLoadingNews: false,
  textModalNewsId: null,

  hydrateFromEdition: (edition) => {
    const persisted = loadPersisted(edition.id)
    const items = mergeManualPersistedItems(edition.id, {}, persisted)
    savePersisted(edition.id, items)
    set({ items, selectedNewsItemId: null, highlightedNewsByPage: {}, textModalNewsId: null })
  },

  hydrateFromApiItems: (edition, apiItems) => {
    const persisted = loadPersisted(edition.id)
    const items = buildItemsFromApi(edition, apiItems, persisted)
    savePersisted(edition.id, items)
    set({ items, selectedNewsItemId: null, highlightedNewsByPage: {}, textModalNewsId: null })
  },

  setLoadingNews: (isLoadingNews) => set({ isLoadingNews }),

  selectNewsItem: (newsId) => set({ selectedNewsItemId: newsId }),

  isNewsHighlighted: (newsId, scope) => {
    const resolved = resolveHighlightScope(get().items, newsId, scope)
    if (!resolved) return false
    const pageSet = get().highlightedNewsByPage[pageScopeKey(resolved.pdfId, resolved.pageNumber)]
    return !!pageSet && newsId in pageSet
  },

  getPageHighlights: (pdfId, pageNumber) =>
    get().highlightedNewsByPage[pageScopeKey(pdfId, pageNumber)] ?? {},

  hasPageNewsHighlight: (pdfId, pageNumber) => {
    const pageSet = get().highlightedNewsByPage[pageScopeKey(pdfId, pageNumber)]
    return !!pageSet && Object.keys(pageSet).length > 0
  },

  unhighlightNewsItems: (newsIds: string[]) => {
    if (newsIds.length === 0) return
    const removeSet = new Set(newsIds)
    set((state) => ({
      selectedNewsItemId: removeSet.has(state.selectedNewsItemId ?? '')
        ? null
        : state.selectedNewsItemId,
      highlightedNewsByPage: removeNewsIdsFromHighlights(state.highlightedNewsByPage, newsIds),
    }))
  },

  selectNewsHighlight: (newsId, multi, scope) => {
    const resolved = resolveHighlightScope(get().items, newsId, scope)
    if (!resolved) return

    const key = pageScopeKey(resolved.pdfId, resolved.pageNumber)
    const { highlightedNewsByPage } = get()
    const current = highlightedNewsByPage[key] ?? {}

    if (multi) {
      const next = { ...current }
      if (newsId in next) delete next[newsId]
      else next[newsId] = true
      set({ highlightedNewsByPage: setPageHighlights(highlightedNewsByPage, key, next) })
      return
    }

    set({ highlightedNewsByPage: setPageHighlights(highlightedNewsByPage, key, { [newsId]: true }) })
  },

  clearNewsHighlight: (scope) => {
    if (!scope) {
      set({ highlightedNewsByPage: {} })
      return
    }
    const key = pageScopeKey(scope.pdfId, scope.pageNumber)
    const { highlightedNewsByPage } = get()
    if (!(key in highlightedNewsByPage)) return
    set({ highlightedNewsByPage: setPageHighlights(highlightedNewsByPage, key, {}) })
  },

  addManualNewsItem: ({ editionId, pdfId, pageNumber, title }) => {
    const item = createManualNewsItem(get().items, { editionId, pdfId, pageNumber, title })
    set((state) => {
      const items = { ...state.items, [item.id]: item }
      savePersisted(editionId, items)
      return { items, selectedNewsItemId: item.id }
    })
    return item.id
  },

  linkCropToNews: (newsId, cropId) => {
    const item = get().items[newsId]
    if (!item) return
    set((state) => {
      const items = {
        ...state.items,
        [newsId]: { ...item, cropId },
      }
      savePersisted(item.editionId, items)
      return { items }
    })
  },

  unlinkNewsCrop: (newsId) => {
    const item = get().items[newsId]
    if (!item) return
    set((state) => {
      const items = {
        ...state.items,
        [newsId]: { ...item, cropId: null },
      }
      savePersisted(item.editionId, items)
      return { items }
    })
  },

  syncNewsCropLink: (newsId) => syncNewsCropLink(newsId),

  getNewsItem: (newsId) => get().items[newsId],

  updateNewsItemTitle: (newsId, title) => {
    const item = get().items[newsId]
    if (!item) return
    set((state) => {
      const items = {
        ...state.items,
        [newsId]: { ...item, title },
      }
      savePersisted(item.editionId, items)
      return { items }
    })
  },

  updateNewsItemText: (newsId, text) => {
    const item = get().items[newsId]
    if (!item) return
    set((state) => {
      const items = {
        ...state.items,
        [newsId]: { ...item, text },
      }
      savePersisted(item.editionId, items)
      return { items }
    })
  },

  consolidateNewsAfterCropMerge: (params) => consolidateNewsAfterCropMerge(params),

  splitNewsForUngroupedCrop: (cropId) => splitNewsForUngroupedCrop(cropId),

  deleteManualNewsItem: (newsId) => deleteManualNewsItem(newsId),

  getNewsForPdf: (pdfId) =>
    Object.values(get().items).filter((item) => item.pdfId === pdfId),

  findNewsByCropId: (cropId) => findNewsByCropId(cropId),

  ensureNewsForCrop: (cropId) => ensureNewsForCrop(cropId),

  openNewsTextModal: (newsId) => openNewsTextModal(newsId),

  closeNewsTextModal: () => set({ textModalNewsId: null }),
}))

registerNewsStore({
  getState: useNewsStore.getState,
  setState: useNewsStore.setState,
})
