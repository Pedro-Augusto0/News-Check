import { create } from 'zustand'
import type { StoredNewsItem, VehicleEdition } from '@/types/session'
import { generateId } from '@/utils/cn'
import { isManualNewsItem } from '@/utils/newsItem'
import { comparePageKeys, pageScopeKey } from '@/utils/pageKey'
import { useCropsStore } from '@/stores/cropsStore'

export type NewsPageHighlightMap = Record<string, Record<string, true>>

export interface NewsHighlightScope {
  pdfId: string
  pageNumber: string
}

interface PersistedNewsState {
  items: Record<string, StoredNewsItem>
}

interface NewsState {
  items: Record<string, StoredNewsItem>
  selectedNewsItemId: string | null
  /** Isolamento na imagem, por página. Página ausente ou vazia = mostrar todas. */
  highlightedNewsByPage: NewsPageHighlightMap
  isLoadingNews: boolean

  hydrateFromEdition: (edition: VehicleEdition) => void
  hydrateFromApiItems: (edition: VehicleEdition, apiItems: StoredNewsItem[]) => void
  setLoadingNews: (loading: boolean) => void
  selectNewsItem: (newsId: string | null) => void
  isNewsHighlighted: (newsId: string, scope?: NewsHighlightScope) => boolean
  getPageHighlights: (pdfId: string, pageNumber: string) => Record<string, true>
  hasPageNewsHighlight: (pdfId: string, pageNumber: string) => boolean
  selectNewsHighlight: (newsId: string, multi: boolean, scope?: NewsHighlightScope) => void
  clearNewsHighlight: (scope?: NewsHighlightScope) => void
  unhighlightNewsItems: (newsIds: string[]) => void
  addManualNewsItem: (params: {
    editionId: string
    pdfId: string
    pageNumber: string
    title?: string
  }) => string
  linkCropToNews: (newsId: string, cropId: string) => void
  unlinkNewsCrop: (newsId: string) => void
  syncNewsCropLink: (newsId: string) => void
  getNewsItem: (newsId: string) => StoredNewsItem | undefined
  updateNewsItemTitle: (newsId: string, title: string) => void
  updateNewsItemText: (newsId: string, text: string) => void
  deleteManualNewsItem: (newsId: string) => boolean
  /** Remove notícias duplicadas após juntar cortes (inclui notícias da API). */
  consolidateNewsAfterCropMerge: (params: {
    keepNewsId: string | null
    removeNewsIds: string[]
  }) => void
  /** Separa a notícia do corte desagrupado quando ainda compartilha vínculo com o grupo. */
  splitNewsForUngroupedCrop: (cropId: string) => void
  getNewsForPdf: (pdfId: string) => StoredNewsItem[]
  findNewsByCropId: (cropId: string) => StoredNewsItem | undefined
  ensureNewsForCrop: (cropId: string) => string | null
  textModalNewsId: string | null
  openNewsTextModal: (newsId: string) => void
  closeNewsTextModal: () => void
}

function storageKey(editionId: string) {
  return `feature-crops-news-${editionId}`
}

function loadPersisted(editionId: string): PersistedNewsState | null {
  try {
    const raw = localStorage.getItem(storageKey(editionId))
    if (!raw) return null
    return JSON.parse(raw) as PersistedNewsState
  } catch {
    return null
  }
}

function savePersisted(editionId: string, items: Record<string, StoredNewsItem>) {
  const editionItems: Record<string, StoredNewsItem> = {}
  for (const [id, item] of Object.entries(items)) {
    if (item.editionId === editionId) editionItems[id] = item
  }
  localStorage.setItem(storageKey(editionId), JSON.stringify({ items: editionItems }))
}

function nextListOrderForPage(
  items: Record<string, StoredNewsItem>,
  pdfId: string,
  pageNumber: string,
): number {
  let max = -1
  for (const item of Object.values(items)) {
    if (item.pdfId !== pdfId || item.pageNumber !== pageNumber) continue
    if (item.listOrder !== undefined) max = Math.max(max, item.listOrder)
  }
  return max + 1
}

function mergeManualPersistedItems(
  editionId: string,
  items: Record<string, StoredNewsItem>,
  persisted: PersistedNewsState | null,
): Record<string, StoredNewsItem> {
  if (!persisted) return items

  const next = { ...items }
  for (const [id, item] of Object.entries(persisted.items)) {
    if (item.editionId !== editionId) continue
    if (next[id]) continue
    if (item.manual) {
      next[id] = item
    }
  }
  return next
}

function buildItemsFromApi(
  edition: VehicleEdition,
  apiItems: StoredNewsItem[],
  persisted: PersistedNewsState | null,
): Record<string, StoredNewsItem> {
  const items: Record<string, StoredNewsItem> = {}

  for (const [index, news] of apiItems.entries()) {
    const persistedItem = persisted?.items[news.id]
    const persistedCropId = persistedItem?.cropId
    // Mantém só vínculo de corte manual/desenhado; seed da API é recriado em seguida.
    const cropId =
      persistedCropId && !persistedCropId.startsWith('crop-api-') ? persistedCropId : null

    items[news.id] = {
      ...news,
      editionId: edition.id,
      cropId,
      listOrder: news.listOrder ?? index,
      title: persistedItem?.title && persistedItem.manual ? persistedItem.title : news.title,
    }
  }

  return mergeManualPersistedItems(edition.id, items, persisted)
}

function resolveHighlightScope(
  items: Record<string, StoredNewsItem>,
  newsId: string,
  scope?: NewsHighlightScope,
): NewsHighlightScope | null {
  if (scope) return scope
  const item = items[newsId]
  if (!item) return null
  return { pdfId: item.pdfId, pageNumber: item.pageNumber }
}

function setPageHighlights(
  byPage: NewsPageHighlightMap,
  key: string,
  pageSet: Record<string, true>,
): NewsPageHighlightMap {
  const next = { ...byPage }
  if (Object.keys(pageSet).length === 0) delete next[key]
  else next[key] = pageSet
  return next
}

function removeNewsIdsFromHighlights(
  byPage: NewsPageHighlightMap,
  newsIds: Iterable<string>,
  replaceWithId?: string | null,
): NewsPageHighlightMap {
  const removeSet = new Set(newsIds)
  if (removeSet.size === 0) return byPage

  let changed = false
  const next: NewsPageHighlightMap = {}

  for (const [key, pageSet] of Object.entries(byPage)) {
    const updated: Record<string, true> = {}
    let pageChanged = false
    let replaced = false

    for (const id of Object.keys(pageSet)) {
      if (!removeSet.has(id)) {
        updated[id] = true
        continue
      }
      pageChanged = true
      if (replaceWithId && !replaced) {
        updated[replaceWithId] = true
        replaced = true
      }
    }

    if (pageChanged) changed = true
    if (Object.keys(updated).length > 0) next[key] = pageChanged ? updated : pageSet
  }

  return changed ? next : byPage
}

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
    const id = generateId('news')
    const { items } = get()
    const item: StoredNewsItem = {
      id,
      title: title ?? 'Nova notícia',
      cropId: null,
      pdfId,
      pageNumber,
      editionId,
      manual: true,
      listOrder: nextListOrderForPage(items, pdfId, pageNumber),
    }
    set((state) => {
      const items = { ...state.items, [id]: item }
      savePersisted(editionId, items)
      return { items, selectedNewsItemId: id }
    })
    return id
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

  syncNewsCropLink: (newsId) => {
    const item = get().items[newsId]
    if (!item) return

    const crops = useCropsStore.getState().crops
    const groups = useCropsStore.getState().groups
    const linked = Object.values(crops).filter((c) => c.newsItemId === newsId)

    if (linked.length === 0) {
      get().unlinkNewsCrop(newsId)
      return
    }

    const grouped = linked.find((c) => c.groupId && groups[c.groupId])
    const rootCropId =
      grouped?.groupId && groups[grouped.groupId]
        ? groups[grouped.groupId].cropIds[0]
        : linked.sort((a, b) => {
            if (a.pageNumber !== b.pageNumber) return comparePageKeys(a.pageNumber, b.pageNumber)
            return a.rect.y - b.rect.y
          })[0].id

    if (item.cropId === rootCropId) return
    get().linkCropToNews(newsId, rootCropId)
  },

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

  consolidateNewsAfterCropMerge: ({ keepNewsId, removeNewsIds }) => {
    const toRemove = removeNewsIds.filter((id) => id && id !== keepNewsId)
    if (toRemove.length === 0) {
      if (keepNewsId) get().syncNewsCropLink(keepNewsId)
      return
    }

    const removeSet = new Set(toRemove)
    let editionId: string | undefined
    const cropsState = useCropsStore.getState()

    set((state) => {
      const items = { ...state.items }
      const keepItem = keepNewsId ? items[keepNewsId] : undefined
      const keepCrop =
        (keepItem?.cropId ? cropsState.crops[keepItem.cropId] : undefined) ??
        Object.values(cropsState.crops).find((crop) => crop.newsItemId === keepNewsId)
      const fromCrops = keepCrop?.groupId
        ? cropsState.getGroupText(keepCrop.groupId).trim()
        : keepCrop?.text.trim() || ''

      const parts: string[] = []
      const seen = new Set<string>()
      const orderedIds = keepNewsId ? [keepNewsId, ...toRemove] : toRemove

      if (fromCrops) {
        parts.push(fromCrops)
      } else {
        for (const id of orderedIds) {
          const text = items[id]?.text?.trim()
          if (!text || seen.has(text)) continue
          seen.add(text)
          parts.push(text)
        }
      }

      const combined = parts.join('\n\n')
      if (keepNewsId && items[keepNewsId] && combined) {
        items[keepNewsId] = { ...items[keepNewsId], text: combined }
      }

      for (const id of toRemove) {
        const item = items[id]
        if (!item) continue
        editionId = item.editionId
        delete items[id]
      }
      if (editionId) savePersisted(editionId, items)

      const selectedRemoved = state.selectedNewsItemId && removeSet.has(state.selectedNewsItemId)
      const modalRemoved = state.textModalNewsId && removeSet.has(state.textModalNewsId)

      return {
        items,
        selectedNewsItemId: selectedRemoved ? keepNewsId : state.selectedNewsItemId,
        textModalNewsId: modalRemoved ? null : state.textModalNewsId,
        highlightedNewsByPage: removeNewsIdsFromHighlights(
          state.highlightedNewsByPage,
          removeSet,
          keepNewsId,
        ),
      }
    })

    if (keepNewsId) get().syncNewsCropLink(keepNewsId)
  },

  splitNewsForUngroupedCrop: (cropId) => {
    const crops = useCropsStore.getState().crops
    const crop = crops[cropId]
    if (!crop?.newsItemId) return

    const sharedNewsId = crop.newsItemId
    const sharedNews = get().items[sharedNewsId]
    const othersSharing = Object.values(crops).some(
      (c) => c.id !== cropId && c.newsItemId === sharedNewsId,
    )
    if (!othersSharing) return

    const id = generateId('news')
    const { items } = get()
    const item: StoredNewsItem = {
      id,
      title: crop.title || sharedNews?.title || 'Sem título',
      text: crop.text || sharedNews?.text || '',
      cropId,
      pdfId: crop.pdfId,
      pageNumber: crop.pageNumber,
      editionId: crop.editionId,
      manual: true,
      clientKeywordsFound: crop.clientKeywordsFound ?? sharedNews?.clientKeywordsFound,
      listOrder: nextListOrderForPage(items, crop.pdfId, crop.pageNumber),
    }

    set((state) => {
      const items = { ...state.items, [id]: item }
      savePersisted(crop.editionId, items)
      return { items }
    })

    useCropsStore.getState().setNewsItemIdForRelatedCrops(cropId, id)
    get().syncNewsCropLink(sharedNewsId)
  },

  deleteManualNewsItem: (newsId) => {
    const item = get().items[newsId]
    if (!isManualNewsItem(item)) return false

    const cropsState = useCropsStore.getState()
    const cropIds = new Set<string>()
    for (const crop of Object.values(cropsState.crops)) {
      if (crop.newsItemId === newsId) cropIds.add(crop.id)
    }
    if (item.cropId) cropIds.add(item.cropId)

    for (const cropId of cropIds) {
      if (useCropsStore.getState().crops[cropId]) {
        useCropsStore.getState().deleteCrop(cropId)
      }
    }

    set((state) => {
      const items = { ...state.items }
      delete items[newsId]
      savePersisted(item.editionId, items)
      return {
        items,
        selectedNewsItemId: state.selectedNewsItemId === newsId ? null : state.selectedNewsItemId,
        highlightedNewsByPage: removeNewsIdsFromHighlights(state.highlightedNewsByPage, [newsId]),
      }
    })

    return true
  },

  getNewsForPdf: (pdfId) =>
    Object.values(get().items).filter((item) => item.pdfId === pdfId),

  findNewsByCropId: (cropId) => {
    const { items } = get()
    const crops = useCropsStore.getState().crops
    const crop = crops[cropId]
    if (crop?.newsItemId && items[crop.newsItemId]) {
      return items[crop.newsItemId]
    }

    const direct = Object.values(items).find((item) => item.cropId === cropId)
    if (direct) return direct

    if (crop?.groupId) {
      const groups = useCropsStore.getState().groups
      const group = groups[crop.groupId]
      const rootId = group?.cropIds[0]
      if (rootId) {
        return Object.values(items).find((item) => item.cropId === rootId)
      }
    }

    return undefined
  },

  ensureNewsForCrop: (cropId) => {
    const crops = useCropsStore.getState().crops
    const groups = useCropsStore.getState().groups
    const crop = crops[cropId]
    if (!crop) return null

    const existing = get().findNewsByCropId(cropId)
    if (existing) {
      const rootCropId =
        crop.groupId && groups[crop.groupId]
          ? groups[crop.groupId].cropIds[0]
          : cropId
      useCropsStore.getState().setNewsItemIdForRelatedCrops(rootCropId, existing.id)
      return existing.id
    }

    if (crop.newsItemId && get().items[crop.newsItemId]) {
      return crop.newsItemId
    }

    const rootCropId =
      crop.groupId && groups[crop.groupId] ? groups[crop.groupId].cropIds[0] : cropId
    const rootCrop = crops[rootCropId] ?? crop

    const id = generateId('news')
    const { items } = get()
    const item: StoredNewsItem = {
      id,
      title: rootCrop.title || 'Sem título',
      cropId: rootCropId,
      pdfId: rootCrop.pdfId,
      pageNumber: rootCrop.pageNumber,
      editionId: rootCrop.editionId,
      manual: true,
      clientKeywordsFound: rootCrop.clientKeywordsFound,
      listOrder: nextListOrderForPage(items, rootCrop.pdfId, rootCrop.pageNumber),
    }

    set((state) => {
      const items = { ...state.items, [id]: item }
      savePersisted(rootCrop.editionId, items)
      return { items }
    })

    useCropsStore.getState().setNewsItemIdForRelatedCrops(rootCropId, id)
    return id
  },

  openNewsTextModal: (newsId) => {
    useCropsStore.getState().closeTextModal()
    set({ textModalNewsId: newsId })
  },

  closeNewsTextModal: () => set({ textModalNewsId: null }),
}))

export function collectNewsIdsForCrops(
  crops: Record<string, import('@/types/session').Crop>,
  cropIds: string[],
  items: Record<string, StoredNewsItem>,
): string[] {
  const mergedSet = new Set(cropIds)
  const ids = new Set<string>()

  for (const cropId of cropIds) {
    const crop = crops[cropId]
    if (crop?.newsItemId) ids.add(crop.newsItemId)
  }

  for (const item of Object.values(items)) {
    if (item.cropId && mergedSet.has(item.cropId)) ids.add(item.id)
  }

  return [...ids]
}

export function hasCropsForNews(
  newsId: string,
  crops: Record<string, import('@/types/session').Crop>,
): boolean {
  return Object.values(crops).some((crop) => crop.newsItemId === newsId)
}
