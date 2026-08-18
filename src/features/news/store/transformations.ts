import type { VehicleEdition } from '@/features/edition-session'
import type { StoredNewsItem } from '../model'
import type { PersistedNewsState } from './persistence'

export function nextListOrderForPage(
  items: Record<string, StoredNewsItem>,
  pdfId: string,
  pageNumber: string,
): number {
  let max = -1
  for (const item of Object.values(items)) {
    if (item.pdfId === pdfId && item.pageNumber === pageNumber && item.listOrder !== undefined) {
      max = Math.max(max, item.listOrder)
    }
  }
  return max + 1
}

export function mergeManualPersistedItems(
  editionId: string,
  items: Record<string, StoredNewsItem>,
  persisted: PersistedNewsState | null,
): Record<string, StoredNewsItem> {
  if (!persisted) return items
  const next = { ...items }
  for (const [id, item] of Object.entries(persisted.items)) {
    if (item.editionId === editionId && !next[id] && item.manual) next[id] = item
  }
  return next
}

export function buildItemsFromApi(
  edition: VehicleEdition,
  apiItems: StoredNewsItem[],
  persisted: PersistedNewsState | null,
): Record<string, StoredNewsItem> {
  const items: Record<string, StoredNewsItem> = {}
  for (const [index, news] of apiItems.entries()) {
    const persistedItem = persisted?.items[news.id]
    const persistedCropId = persistedItem?.cropId
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
