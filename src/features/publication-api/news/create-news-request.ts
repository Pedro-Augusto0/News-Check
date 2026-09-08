import type { Crop } from '@/features/crops'
import { API_CROP_ID_PREFIX, formatCropRectToApiCoordinates, isApiSeededCropId } from '@/features/crops/api-coordinates'
import type { VehicleEdition } from '@/features/edition-session/model'
import type { StoredNewsItem } from '@/features/news'
import type { PageData } from '@/features/page-navigation'
import { comparePageKeys } from '@/features/page-navigation/page-key'
import type { ReviewQueueItem } from '@/features/review-queue/model'
import type { CreateNewsRequestDto } from '../dto'

export function parseArticleId(newsId: string): number | null {
  const value = Number.parseInt(newsId, 10)
  return Number.isFinite(value) ? value : null
}

export function resolveArticleIds(newsItem?: StoredNewsItem): number[] {
  if (!newsItem) return []
  if (newsItem.articleIds?.length) return [...newsItem.articleIds]
  const parsed = parseArticleId(newsItem.id)
  return parsed !== null ? [parsed] : []
}

export function resolveClippingArticleId(
  crop: Crop,
  newsItems: Record<string, StoredNewsItem>,
  primaryNewsItem?: StoredNewsItem,
): number {
  if (isApiSeededCropId(crop.id) && crop.id.startsWith(API_CROP_ID_PREFIX)) {
    const parsed = parseArticleId(crop.id.slice(API_CROP_ID_PREFIX.length))
    if (parsed !== null) return parsed
  }

  const newsId = crop.newsItemId ?? primaryNewsItem?.id
  if (!newsId) return 0

  const stored = newsItems[newsId]
  if (stored) {
    const ids = resolveArticleIds(stored)
    if (ids.length === 1) return ids[0]
  }

  return parseArticleId(newsId) ?? 0
}

function resolvePublication(newsItem: StoredNewsItem | undefined, edition: VehicleEdition): string {
  const fromApi = newsItem?.apiPublication?.trim()
  if (fromApi) return fromApi
  const dateOnly = edition.editionDate.trim()
  return dateOnly.includes('T') ? dateOnly : `${dateOnly}T00:00:00`
}

function sortCrops(crops: Crop[]): Crop[] {
  return [...crops].sort((first, second) => {
    const page = comparePageKeys(first.pageNumber, second.pageNumber)
    if (page !== 0) return page
    if (first.rect.y !== second.rect.y) return first.rect.y - second.rect.y
    return first.rect.x - second.rect.x
  })
}

export function buildCreateNewsRequest(input: {
  item: ReviewQueueItem
  crops: Record<string, Crop>
  newsItems: Record<string, StoredNewsItem>
  edition: VehicleEdition
  pages: PageData[]
}): CreateNewsRequestDto | null {
  const { item, crops, newsItems, edition, pages } = input

  if (item.kind === 'empty-page') return null

  const itemCrops = sortCrops(
    item.cropIds.map((id) => crops[id]).filter((crop): crop is Crop => !!crop),
  )
  if (itemCrops.length === 0) return null

  const newsItem = item.newsId ? newsItems[item.newsId] : undefined
  const pageByNumber = new Map(pages.map((page) => [page.pageNumber, page]))

  return {
    articleIds: resolveArticleIds(newsItem),
    title: item.title.trim() || 'Sem título',
    publication: resolvePublication(newsItem, edition),
    section: newsItem?.section ?? '',
    page: item.pageNumber,
    text: item.text,
    author: newsItem?.author ?? '',
    hasPhoto: false,
    clippings: itemCrops.map((crop) => {
      const page = pageByNumber.get(crop.pageNumber)
      return {
        articleId: resolveClippingArticleId(crop, newsItems, newsItem),
        coordinates: formatCropRectToApiCoordinates(crop.rect),
        page: crop.pageNumber,
        filePath: page?.filePath ?? page?.imageUrl ?? '',
      }
    }),
  }
}
