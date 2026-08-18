import type { Crop } from '@/features/crops/model'
import type { CropsState } from '@/features/crops/store/state-types'
import type { StoredNewsItem } from '@/features/news/model'
import { createManualNewsFromCrop, createManualNewsItem } from '@/features/news/store/manual-items'
import { savePersistedNews } from '@/features/news/store/persistence'
import type { NewsState } from '@/features/news/store/state-types'
import { removeNewsIdsFromHighlights } from '@/features/news/store/highlights'
import { comparePageKeys } from '@/features/page-navigation/page-key'
import { isManualNewsItem } from '@/features/news/model'

interface StorePort<State> {
  getState: () => State
  setState: (updater: Partial<State> | ((state: State) => Partial<State>)) => void
}

let cropsPort: StorePort<CropsState> | undefined
let newsPort: StorePort<NewsState> | undefined

export function registerCropsStore(port: StorePort<CropsState>) {
  cropsPort = port
}

export function registerNewsStore(port: StorePort<NewsState>) {
  newsPort = port
}

function cropsStore() {
  if (!cropsPort) throw new Error('Crops store is not registered for crop-news linking')
  return cropsPort
}

function newsStore() {
  if (!newsPort) throw new Error('News store is not registered for crop-news linking')
  return newsPort
}

export function getLinkedNewsItems(): Record<string, StoredNewsItem> {
  return newsStore().getState().items
}

export function linkCropToNews(newsId: string, cropId: string) {
  newsStore().getState().linkCropToNews(newsId, cropId)
}

export function unhighlightLinkedNews(newsIds: string[]) {
  newsStore().getState().unhighlightNewsItems(newsIds)
}

export function closeNewsTextModal() {
  newsStore().getState().closeNewsTextModal()
}

export function openNewsTextModalFromCrop(newsId: string) {
  newsStore().setState({ textModalNewsId: newsId })
}

export function collectNewsIdsForCrops(
  crops: Record<string, Crop>,
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
  crops: Record<string, Crop>,
): boolean {
  return Object.values(crops).some((crop) => crop.newsItemId === newsId)
}

export function syncNewsCropLink(newsId: string) {
  const news = newsStore().getState()
  const item = news.items[newsId]
  if (!item) return
  const { crops, groups } = cropsStore().getState()
  const linked = Object.values(crops).filter((crop) => crop.newsItemId === newsId)
  if (linked.length === 0) {
    news.unlinkNewsCrop(newsId)
    return
  }
  const grouped = linked.find((crop) => crop.groupId && groups[crop.groupId])
  const rootCropId =
    grouped?.groupId && groups[grouped.groupId]
      ? groups[grouped.groupId].cropIds[0]
      : linked.sort((first, second) => {
          if (first.pageNumber !== second.pageNumber) {
            return comparePageKeys(first.pageNumber, second.pageNumber)
          }
          return first.rect.y - second.rect.y
        })[0].id
  if (item.cropId !== rootCropId) news.linkCropToNews(newsId, rootCropId)
}

export function consolidateNewsAfterCropMerge(params: {
  keepNewsId: string | null
  removeNewsIds: string[]
}) {
  const { keepNewsId, removeNewsIds } = params
  const toRemove = removeNewsIds.filter((id) => id && id !== keepNewsId)
  if (toRemove.length === 0) {
    if (keepNewsId) syncNewsCropLink(keepNewsId)
    return
  }
  const removeSet = new Set(toRemove)
  const crops = cropsStore().getState()
  newsStore().setState((state) => {
    const items = { ...state.items }
    const keepItem = keepNewsId ? items[keepNewsId] : undefined
    const keepCrop =
      (keepItem?.cropId ? crops.crops[keepItem.cropId] : undefined) ??
      Object.values(crops.crops).find((crop) => crop.newsItemId === keepNewsId)
    const fromCrops = keepCrop?.groupId
      ? crops.getGroupText(keepCrop.groupId).trim()
      : keepCrop?.text.trim() || ''
    const parts: string[] = []
    const seen = new Set<string>()
    if (fromCrops) {
      parts.push(fromCrops)
    } else {
      for (const id of keepNewsId ? [keepNewsId, ...toRemove] : toRemove) {
        const text = items[id]?.text?.trim()
        if (text && !seen.has(text)) {
          seen.add(text)
          parts.push(text)
        }
      }
    }
    const combined = parts.join('\n\n')
    if (keepNewsId && items[keepNewsId] && combined) {
      items[keepNewsId] = { ...items[keepNewsId], text: combined }
    }
    let editionId: string | undefined
    for (const id of toRemove) {
      if (items[id]) editionId = items[id].editionId
      delete items[id]
    }
    if (editionId) savePersistedNews(editionId, items)
    return {
      items,
      selectedNewsItemId:
        state.selectedNewsItemId && removeSet.has(state.selectedNewsItemId)
          ? keepNewsId
          : state.selectedNewsItemId,
      textModalNewsId:
        state.textModalNewsId && removeSet.has(state.textModalNewsId)
          ? null
          : state.textModalNewsId,
      highlightedNewsByPage: removeNewsIdsFromHighlights(
        state.highlightedNewsByPage,
        removeSet,
        keepNewsId,
      ),
    }
  })
  if (keepNewsId) syncNewsCropLink(keepNewsId)
}

export function splitNewsForUngroupedCrop(cropId: string) {
  const crops = cropsStore().getState()
  const crop = crops.crops[cropId]
  if (!crop?.newsItemId) return
  const sharedNewsId = crop.newsItemId
  const news = newsStore().getState()
  const othersSharing = Object.values(crops.crops).some(
    (item) => item.id !== cropId && item.newsItemId === sharedNewsId,
  )
  if (!othersSharing) return
  const item = createManualNewsFromCrop(news.items, crop, news.items[sharedNewsId])
  newsStore().setState((state) => {
    const items = { ...state.items, [item.id]: item }
    savePersistedNews(crop.editionId, items)
    return { items }
  })
  crops.setNewsItemIdForRelatedCrops(cropId, item.id)
  syncNewsCropLink(sharedNewsId)
}

export function deleteManualNewsItem(newsId: string): boolean {
  const news = newsStore().getState()
  const item = news.items[newsId]
  if (!isManualNewsItem(item)) return false
  const crops = cropsStore().getState()
  const cropIds = new Set(
    Object.values(crops.crops)
      .filter((crop) => crop.newsItemId === newsId)
      .map((crop) => crop.id),
  )
  if (item.cropId) cropIds.add(item.cropId)
  for (const cropId of cropIds) {
    if (cropsStore().getState().crops[cropId]) cropsStore().getState().deleteCrop(cropId)
  }
  newsStore().setState((state) => {
    const items = { ...state.items }
    delete items[newsId]
    savePersistedNews(item.editionId, items)
    return {
      items,
      selectedNewsItemId: state.selectedNewsItemId === newsId ? null : state.selectedNewsItemId,
      highlightedNewsByPage: removeNewsIdsFromHighlights(
        state.highlightedNewsByPage,
        [newsId],
      ),
    }
  })
  return true
}

export function findNewsByCropId(cropId: string): StoredNewsItem | undefined {
  const { items } = newsStore().getState()
  const { crops, groups } = cropsStore().getState()
  const crop = crops[cropId]
  if (crop?.newsItemId && items[crop.newsItemId]) return items[crop.newsItemId]
  const direct = Object.values(items).find((item) => item.cropId === cropId)
  if (direct) return direct
  const rootId = crop?.groupId ? groups[crop.groupId]?.cropIds[0] : undefined
  return rootId ? Object.values(items).find((item) => item.cropId === rootId) : undefined
}

export function ensureNewsForCrop(cropId: string): string | null {
  const crops = cropsStore().getState()
  const crop = crops.crops[cropId]
  if (!crop) return null
  const existing = findNewsByCropId(cropId)
  const rootCropId =
    crop.groupId && crops.groups[crop.groupId]
      ? crops.groups[crop.groupId].cropIds[0]
      : cropId
  if (existing) {
    crops.setNewsItemIdForRelatedCrops(rootCropId, existing.id)
    return existing.id
  }
  const news = newsStore().getState()
  if (crop.newsItemId && news.items[crop.newsItemId]) return crop.newsItemId
  const rootCrop = crops.crops[rootCropId] ?? crop
  const item = createManualNewsItem(news.items, {
    editionId: rootCrop.editionId,
    pdfId: rootCrop.pdfId,
    pageNumber: rootCrop.pageNumber,
    title: rootCrop.title || 'Sem título',
    cropId: rootCropId,
    clientKeywordsFound: rootCrop.clientKeywordsFound,
  })
  newsStore().setState((state) => {
    const items = { ...state.items, [item.id]: item }
    savePersistedNews(rootCrop.editionId, items)
    return { items }
  })
  crops.setNewsItemIdForRelatedCrops(rootCropId, item.id)
  return item.id
}

export function openNewsTextModal(newsId: string) {
  cropsStore().getState().closeTextModal()
  newsStore().setState({ textModalNewsId: newsId })
}
