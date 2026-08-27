import type { Crop, CropGroup } from '@/features/crops'
import type { PageData } from '@/features/page-navigation'
import { comparePageKeys } from '@/features/page-navigation/page-key'
import type { StoredNewsItem } from '@/features/news'
import { newsItemHasClient } from '@/features/news/view-model'
import type { ReviewQueueItem, ReviewSuspectReason } from '../model'
import { detectCropSuspects } from './suspect-heuristics'

function newsCropsFor(
  news: StoredNewsItem,
  crops: Record<string, Crop>,
  groups: Record<string, CropGroup>,
): Crop[] {
  const matched = Object.values(crops).filter((crop) => {
    if (crop.editionId !== news.editionId || crop.pdfId !== news.pdfId) return false
    if (crop.newsItemId === news.id) return true
    if (news.cropId && crop.id === news.cropId) return true
    return false
  })

  const ids = new Set(matched.map((crop) => crop.id))
  for (const crop of matched) {
    if (!crop.groupId || !groups[crop.groupId]) continue
    for (const relatedId of groups[crop.groupId].cropIds) {
      const related = crops[relatedId]
      if (related) ids.add(related.id)
    }
  }

  return [...ids].map((id) => crops[id]).filter((crop): crop is Crop => !!crop)
}

function unionRect(crops: Crop[]): ReviewQueueItem['previewRect'] {
  if (crops.length === 0) return null
  let x1 = Infinity
  let y1 = Infinity
  let x2 = -Infinity
  let y2 = -Infinity
  for (const crop of crops) {
    x1 = Math.min(x1, crop.rect.x)
    y1 = Math.min(y1, crop.rect.y)
    x2 = Math.max(x2, crop.rect.x + crop.rect.width)
    y2 = Math.max(y2, crop.rect.y + crop.rect.height)
  }
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 }
}

function pageCropsOf(crops: Record<string, Crop>, pdfId: string, pageNumber: string): Crop[] {
  return Object.values(crops).filter(
    (crop) => crop.pdfId === pdfId && crop.pageNumber === pageNumber,
  )
}

function uniqueReasons(reasons: ReviewSuspectReason[]): ReviewSuspectReason[] {
  return [...new Set(reasons)]
}

export function buildReviewQueue(input: {
  editionId: string
  pdfId: string
  pages: PageData[]
  newsItems: Record<string, StoredNewsItem>
  crops: Record<string, Crop>
  groups: Record<string, CropGroup>
}): ReviewQueueItem[] {
  const items: ReviewQueueItem[] = []
  const linkedCropIds = new Set<string>()

  const editionNews = Object.values(input.newsItems).filter(
    (item) => item.editionId === input.editionId && item.pdfId === input.pdfId,
  )

  for (const news of editionNews) {
    const newsCrops = newsCropsFor(news, input.crops, input.groups)
    for (const crop of newsCrops) linkedCropIds.add(crop.id)

    const pageCrops = pageCropsOf(input.crops, input.pdfId, news.pageNumber)
    const suspectReasons: ReviewSuspectReason[] = []
    if (newsCrops.length === 0) suspectReasons.push('no-crop')
    for (const crop of newsCrops) {
      suspectReasons.push(...detectCropSuspects(crop, pageCrops))
    }

    const keywords = news.clientKeywordsFound ?? []
    items.push({
      id: `news:${news.id}`,
      kind: 'news',
      editionId: news.editionId,
      pdfId: news.pdfId,
      pageNumber: news.pageNumber,
      newsId: news.id,
      cropIds: newsCrops.map((crop) => crop.id),
      title: news.title || newsCrops[0]?.title || 'Notícia sem título',
      text: news.text || newsCrops[0]?.text || '',
      clientKeywords: keywords,
      hasClient: newsItemHasClient(news) || newsCrops.some((crop) => (crop.clientKeywordsFound?.length ?? 0) > 0),
      suspectReasons: uniqueReasons(suspectReasons),
      sortY: newsCrops[0]?.rect.y ?? 900 + (news.listOrder ?? 0),
      previewRect: unionRect(newsCrops),
    })
  }

  for (const crop of Object.values(input.crops)) {
    if (crop.editionId !== input.editionId || crop.pdfId !== input.pdfId) continue
    if (linkedCropIds.has(crop.id)) continue
    if (crop.newsItemId) continue

    const pageCrops = pageCropsOf(input.crops, input.pdfId, crop.pageNumber)
    items.push({
      id: `orphan:${crop.id}`,
      kind: 'orphan-crop',
      editionId: crop.editionId,
      pdfId: crop.pdfId,
      pageNumber: crop.pageNumber,
      newsId: null,
      cropIds: [crop.id],
      title: crop.title || 'Recorte sem notícia',
      text: crop.text,
      clientKeywords: crop.clientKeywordsFound ?? [],
      hasClient: (crop.clientKeywordsFound?.length ?? 0) > 0,
      suspectReasons: uniqueReasons(['orphan-crop', ...detectCropSuspects(crop, pageCrops)]),
      sortY: crop.rect.y,
      previewRect: crop.rect,
    })
  }

  const occupiedPages = new Set(items.map((item) => item.pageNumber))
  for (const page of input.pages) {
    if (occupiedPages.has(page.pageNumber)) continue
    items.push({
      id: `empty:${input.pdfId}:${page.pageNumber}`,
      kind: 'empty-page',
      editionId: input.editionId,
      pdfId: input.pdfId,
      pageNumber: page.pageNumber,
      newsId: null,
      cropIds: [],
      title: `Página ${page.pageNumber}`,
      text: '',
      clientKeywords: [],
      hasClient: false,
      suspectReasons: ['empty-page'],
      sortY: 0,
      previewRect: null,
    })
  }

  return items.sort((a, b) => {
    const page = comparePageKeys(a.pageNumber, b.pageNumber)
    if (page !== 0) return page
    if (a.hasClient !== b.hasClient) return a.hasClient ? -1 : 1
    const aSuspect = a.suspectReasons.length > 0
    const bSuspect = b.suspectReasons.length > 0
    if (aSuspect !== bSuspect) return aSuspect ? -1 : 1
    if (a.sortY !== b.sortY) return a.sortY - b.sortY
    return a.id.localeCompare(b.id)
  })
}

export function filterActiveReviewItems(
  items: ReviewQueueItem[],
  statuses: Record<string, ReviewStatusLike>,
  clientOnly: boolean,
): ReviewQueueItem[] {
  const active = items.filter((item) => !isDone(statuses[item.id]))
  return clientOnly ? active.filter((item) => item.hasClient) : active
}

export function collectApprovedCropIds(
  items: ReviewQueueItem[],
  statuses: Record<string, ReviewStatusLike>,
): Set<string> {
  const ids = new Set<string>()
  for (const item of items) {
    if (statuses[item.id] !== 'approved') continue
    for (const cropId of item.cropIds) ids.add(cropId)
  }
  return ids
}

export function rankQueueForReview(
  items: ReviewQueueItem[],
  statuses: Record<string, ReviewStatusLike>,
  clientOnly: boolean,
): ReviewQueueItem[] {
  const visible = clientOnly ? items.filter((item) => item.hasClient) : items
  return [...visible].sort((a, b) => {
    const aDone = isDone(statuses[a.id])
    const bDone = isDone(statuses[b.id])
    if (aDone !== bDone) return aDone ? 1 : -1
    return 0
  })
}

type ReviewStatusLike = 'pending' | 'approved' | 'rejected' | undefined

function isDone(status: ReviewStatusLike): boolean {
  return status === 'approved' || status === 'rejected'
}

export function firstPendingId(
  items: ReviewQueueItem[],
  statuses: Record<string, ReviewStatusLike>,
): string | null {
  return items.find((item) => !isDone(statuses[item.id]))?.id ?? null
}

export function nextPendingAfterStatus(
  items: ReviewQueueItem[],
  statuses: Record<string, ReviewStatusLike>,
  completedItemId: string,
): string | null {
  const pending = items.filter((item) => {
    if (item.id === completedItemId) return false
    return !isDone(statuses[item.id])
  })
  return pending[0]?.id ?? firstPendingId(items, statuses)
}
