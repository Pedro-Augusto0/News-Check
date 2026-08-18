import type { Crop, CropDisplayNode, CropGroup, StoredNewsItem } from '@/types/session'
import type { CropPageSection } from '@/utils/cropDisplayTree'
import { comparePageKeys } from '@/utils/pageKey'

export type NewsPageEntry =
  | { kind: 'crop'; node: CropDisplayNode; newsId: string | null }
  | { kind: 'pending'; item: StoredNewsItem }

export interface NewsPageSection {
  pageNumber: string
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

function getRelatedCropIds(
  cropId: string,
  crops: Record<string, Crop>,
  groups: Record<string, CropGroup>,
): string[] {
  const crop = crops[cropId]
  if (!crop) return []
  if (crop.groupId && groups[crop.groupId]) {
    return groups[crop.groupId].cropIds.filter((id) => crops[id])
  }
  return [cropId]
}

export function isNewsPageEntryFinalized(
  entry: NewsPageEntry,
  crops: Record<string, Crop>,
  groups: Record<string, CropGroup>,
): boolean {
  if (entry.kind === 'pending') return false
  const cropId = entry.node.crop?.id
  if (!cropId) return false
  const ids = getRelatedCropIds(cropId, crops, groups)
  return ids.length > 0 && ids.every((id) => crops[id]?.finalized)
}

export interface ExcludeFinalizedNewsOptions {
  /** Mantém notícias finalizadas visíveis quando ainda estão em foco (ex.: modal aberto). */
  keepNewsIds?: Iterable<string>
}

export function excludeFinalizedNewsSections(
  sections: NewsPageSection[],
  crops: Record<string, Crop>,
  groups: Record<string, CropGroup>,
  options?: ExcludeFinalizedNewsOptions,
): NewsPageSection[] {
  const keepNewsIds = options?.keepNewsIds ? new Set(options.keepNewsIds) : null

  return sections
    .map((section) => ({
      ...section,
      entries: section.entries.filter((entry) => {
        if (keepNewsIds) {
          const newsId =
            entry.kind === 'pending' ? entry.item.id : (entry.newsId ?? entry.node.crop?.newsItemId)
          if (newsId && keepNewsIds.has(newsId)) return true
        }
        return !isNewsPageEntryFinalized(entry, crops, groups)
      }),
    }))
    .filter((section) => section.entries.length > 0)
}

function resolveEntrySortY(
  entry: NewsPageEntry,
  crops: Record<string, Crop>,
  pageNumber: string,
): number {
  if (entry.kind === 'pending') {
    return 900_000 + (entry.item.listOrder ?? 0)
  }

  const node = entry.node
  if (!node.crop) return 999_000

  if (node.group) {
    const onPage = node.group.cropIds
      .map((id) => crops[id])
      .find((crop) => crop?.pageNumber === pageNumber)
    if (onPage) return onPage.rect.y
  }

  return node.crop.rect.y
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

function sortPageEntries(
  entries: NewsPageEntry[],
  crops: Record<string, Crop>,
  pageNumber: string,
): NewsPageEntry[] {
  return [...entries].sort(
    (a, b) => resolveEntrySortY(a, crops, pageNumber) - resolveEntrySortY(b, crops, pageNumber),
  )
}

function buildPageEntries(
  pageNumber: string,
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

  return sortPageEntries(entries, crops, pageNumber)
}

export function buildNewsPageSections(
  cropSections: CropPageSection[],
  allNews: StoredNewsItem[],
  pdfId: string,
  crops: Record<string, Crop>,
): NewsPageSection[] {
  const cropByPage = new Map(cropSections.map((s) => [s.pageNumber, s.nodes]))
  const newsByPage = new Map<string, StoredNewsItem[]>()

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
    .sort((a, b) => comparePageKeys(a, b))
    .map((pageNumber) => ({
      pageNumber,
      entries: buildPageEntries(
        pageNumber,
        cropByPage.get(pageNumber) ?? [],
        newsByPage.get(pageNumber) ?? [],
        crops,
        pdfId,
      ),
    }))
    .filter((section) => section.entries.length > 0)
}
