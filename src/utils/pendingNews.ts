import type { Crop, NewsItem, StoredNewsItem } from '@/types/session'
import type { CropPageSection } from '@/utils/cropDisplayTree'

export interface NewsPageSection {
  pageNumber: number
  cropNodes: CropPageSection['nodes']
  pendingNews: NewsItem[]
}

export function isNewsItemPending(
  item: NewsItem,
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

export function getPendingNewsForPage(
  pageNumber: number,
  allNews: StoredNewsItem[],
  crops: Record<string, Crop>,
  pdfId: string,
): NewsItem[] {
  return allNews
    .filter((item) => item.pdfId === pdfId && item.pageNumber === pageNumber)
    .filter((item) => isNewsItemPending(item, crops, pdfId))
}

export function newsItemHasClient(item: NewsItem): boolean {
  return (item.clientKeywordsFound?.length ?? 0) > 0
}

export function buildNewsPageSections(
  cropSections: CropPageSection[],
  allNews: StoredNewsItem[],
  pdfId: string,
  crops: Record<string, Crop>,
): NewsPageSection[] {
  const cropByPage = new Map(cropSections.map((s) => [s.pageNumber, s.nodes]))
  const pageNumbers = new Set([
    ...cropSections.map((s) => s.pageNumber),
    ...allNews.filter((n) => n.pdfId === pdfId).map((n) => n.pageNumber),
  ])

  return [...pageNumbers]
    .sort((a, b) => a - b)
    .map((pageNumber) => ({
      pageNumber,
      cropNodes: cropByPage.get(pageNumber) ?? [],
      pendingNews: getPendingNewsForPage(pageNumber, allNews, crops, pdfId),
    }))
    .filter((section) => section.cropNodes.length > 0 || section.pendingNews.length > 0)
}
