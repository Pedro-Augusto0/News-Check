import type { Crop, CropDisplayNode, StoredNewsItem } from '@/types/session'
import type { CropPageSection } from '@/utils/cropDisplayTree'

export type NewsPageEntry =
  | { kind: 'crop'; node: CropDisplayNode; newsId: string | null }
  | { kind: 'pending'; item: StoredNewsItem }

export interface NewsPageSection {
  pageNumber: number
  entries: NewsPageEntry[]
}

export function sortNewsForPage(items: StoredNewsItem[]): StoredNewsItem[] {
  return [...items].sort((a, b) => {
    const orderA = a.listOrder ?? Number.MAX_SAFE_INTEGER
    const orderB = b.listOrder ?? Number.MAX_SAFE_INTEGER
    if (orderA !== orderB) return orderA - orderB
    return a.id.localeCompare(b.id)
  })
}

export function isNewsItemPending(
  item: StoredNewsItem,
  crops: Record<string, Crop>,
  pdfId: string,
): boolean {
  const hasActiveCrops = Object.values(crops).some(
    (crop) => crop.pdfId === pdfId && crop.newsItemId === item.id,
  )
  if (hasActiveCrops) return false

  if (item.cropId) {
    const crop = crops[item.cropId]
    if (crop && crop.pdfId === pdfId) return false
  }

  return true
}

export function newsItemHasClient(item: Pick<StoredNewsItem, 'clientKeywordsFound'>): boolean {
  return (item.clientKeywordsFound?.length ?? 0) > 0
}

function findCropNodeForNews(
  news: StoredNewsItem,
  cropNodes: CropDisplayNode[],
  crops: Record<string, Crop>,
): CropDisplayNode | undefined {
  for (const node of cropNodes) {
    const rootCrop = node.crop
    if (!rootCrop) continue

    if (rootCrop.newsItemId === news.id) return node

    if (news.cropId) {
      if (rootCrop.id === news.cropId) return node
      if (node.group?.cropIds.includes(news.cropId)) return node
    }

    if (node.group) {
      const linked = node.group.cropIds.some((id) => crops[id]?.newsItemId === news.id)
      if (linked) return node
    }
  }

  return undefined
}

function buildPageEntries(
  cropNodes: CropDisplayNode[],
  pageNews: StoredNewsItem[],
  crops: Record<string, Crop>,
  pdfId: string,
): NewsPageEntry[] {
  const entries: NewsPageEntry[] = []
  const matchedNodeIds = new Set<string>()
  const sortedNews = sortNewsForPage(pageNews)

  for (const news of sortedNews) {
    if (isNewsItemPending(news, crops, pdfId)) {
      entries.push({ kind: 'pending', item: news })
      continue
    }

    const node = findCropNodeForNews(news, cropNodes, crops)
    if (node) {
      matchedNodeIds.add(node.id)
      entries.push({ kind: 'crop', node, newsId: news.id })
    }
  }

  for (const node of cropNodes) {
    if (matchedNodeIds.has(node.id)) continue
    const newsId = node.crop?.newsItemId ?? null
    entries.push({ kind: 'crop', node, newsId })
  }

  return entries
}

export function buildNewsPageSections(
  cropSections: CropPageSection[],
  allNews: StoredNewsItem[],
  pdfId: string,
  crops: Record<string, Crop>,
): NewsPageSection[] {
  const cropByPage = new Map(cropSections.map((s) => [s.pageNumber, s.nodes]))
  const newsByPage = new Map<number, StoredNewsItem[]>()

  for (const news of allNews) {
    if (news.pdfId !== pdfId) continue
    const list = newsByPage.get(news.pageNumber) ?? []
    list.push(news)
    newsByPage.set(news.pageNumber, list)
  }

  const pageNumbers = new Set([
    ...cropSections.map((s) => s.pageNumber),
    ...newsByPage.keys(),
  ])

  return [...pageNumbers]
    .sort((a, b) => a - b)
    .map((pageNumber) => ({
      pageNumber,
      entries: buildPageEntries(
        cropByPage.get(pageNumber) ?? [],
        newsByPage.get(pageNumber) ?? [],
        crops,
        pdfId,
      ),
    }))
    .filter((section) => section.entries.length > 0)
}
