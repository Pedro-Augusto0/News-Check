import { create } from 'zustand'
import type { StoredNewsItem, VehicleEdition } from '@/types/session'
import { generateId } from '@/utils/cn'
import { isManualNewsItem } from '@/utils/newsItem'
import { useCropsStore } from '@/stores/cropsStore'

interface PersistedNewsState {
  items: Record<string, StoredNewsItem>
}

interface NewsState {
  items: Record<string, StoredNewsItem>
  selectedNewsItemId: string | null

  hydrateFromEdition: (edition: VehicleEdition) => void
  selectNewsItem: (newsId: string | null) => void
  addManualNewsItem: (params: {
    editionId: string
    pdfId: string
    pageNumber: number
    title?: string
  }) => string
  linkCropToNews: (newsId: string, cropId: string) => void
  unlinkNewsCrop: (newsId: string) => void
  syncNewsCropLink: (newsId: string) => void
  getNewsItem: (newsId: string) => StoredNewsItem | undefined
  updateNewsItemTitle: (newsId: string, title: string) => void
  deleteManualNewsItem: (newsId: string) => boolean
  getNewsForPdf: (pdfId: string) => StoredNewsItem[]
  findNewsByCropId: (cropId: string) => StoredNewsItem | undefined
  ensureNewsForCrop: (cropId: string) => string | null
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
  pageNumber: number,
): number {
  let max = -1
  for (const item of Object.values(items)) {
    if (item.pdfId !== pdfId || item.pageNumber !== pageNumber) continue
    if (item.listOrder !== undefined) max = Math.max(max, item.listOrder)
  }
  return max + 1
}

function buildItemsFromEdition(
  edition: VehicleEdition,
  persisted: PersistedNewsState | null,
): Record<string, StoredNewsItem> {
  const items: Record<string, StoredNewsItem> = {}

  for (const pdf of edition.pdfs) {
    for (const page of pdf.pages) {
      for (const [index, news] of (page.newsItems ?? []).entries()) {
        const persistedItem = persisted?.items[news.id]
        items[news.id] = {
          ...news,
          pdfId: pdf.id,
          pageNumber: page.pageNumber,
          editionId: edition.id,
          cropId: persistedItem?.cropId ?? news.cropId,
          listOrder: index,
        }
      }
    }
  }

  if (persisted) {
    for (const [id, item] of Object.entries(persisted.items)) {
      if (item.editionId !== edition.id) continue
      if (!items[id]) {
        items[id] = item
      }
    }
  }

  return items
}

export const useNewsStore = create<NewsState>((set, get) => ({
  items: {},
  selectedNewsItemId: null,

  hydrateFromEdition: (edition) => {
    const persisted = loadPersisted(edition.id)
    const items = buildItemsFromEdition(edition, persisted)
    savePersisted(edition.id, items)
    set({ items, selectedNewsItemId: null })
  },

  selectNewsItem: (newsId) => set({ selectedNewsItemId: newsId }),

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
            if (a.pageNumber !== b.pageNumber) return a.pageNumber - b.pageNumber
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
}))

export function hasCropsForNews(
  newsId: string,
  crops: Record<string, import('@/types/session').Crop>,
): boolean {
  return Object.values(crops).some((crop) => crop.newsItemId === newsId)
}
