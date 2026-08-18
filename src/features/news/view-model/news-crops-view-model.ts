import type { Crop, CropDisplayNode, CropGroup } from '@/features/crops'
import {
  buildCropDisplayTree,
  buildCropsByPageSections,
  cropDisplayInfoFromIndex,
  type CropDisplayInfo,
  type CropPageSection,
} from '@/features/crops/view-model'
import type { PageData } from '@/features/page-navigation'
import type { NewsViewFilter, StoredNewsItem } from '../model'
import { stableColorIndex } from '@/features/crops/colors'
import { cropHasClient, newsDisplayNodeHasClient } from '@/features/crops/client-stats'
import { comparePageKeys } from '@/features/page-navigation/page-key'

export type NewsPageEntry =
  | { kind: 'crop'; node: CropDisplayNode; newsId: string | null }
  | { kind: 'pending'; item: StoredNewsItem }

export interface NewsPageSection {
  pageNumber: string
  entries: NewsPageEntry[]
}

export interface NewsCropsViewModel {
  displayTree: CropDisplayNode[]
  pageSections: NewsPageSection[]
  filteredPageSections: NewsPageSection[]
  cropDisplayIndex: Map<string, CropDisplayInfo>
  newsDisplayIndex: Map<string, number>
  pageCrops: Map<string, Crop[]>
  finalizedCropIds: Set<string>
  clientCropIds: Set<string>
}

export interface NewsCropsViewModelInput {
  editionId: string
  pdfId: string
  crops: Record<string, Crop>
  groups: Record<string, CropGroup>
  newsItems: Record<string, StoredNewsItem> | StoredNewsItem[]
  pages?: PageData[]
  search?: string
  newsViewFilter?: NewsViewFilter
  keepNewsIds?: Iterable<string>
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

export function newsItemHasClient(
  item: Pick<StoredNewsItem, 'clientKeywordsFound'>,
): boolean {
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

export function isCropOrGroupFinalized(
  cropId: string,
  crops: Record<string, Crop>,
  groups: Record<string, CropGroup>,
): boolean {
  const ids = getRelatedCropIds(cropId, crops, groups)
  return ids.length > 0 && ids.every((id) => crops[id]?.finalized)
}

export function isNewsPageEntryFinalized(
  entry: NewsPageEntry,
  crops: Record<string, Crop>,
  groups: Record<string, CropGroup>,
): boolean {
  if (entry.kind === 'pending') return false
  const cropId = entry.node.crop?.id
  return !!cropId && isCropOrGroupFinalized(cropId, crops, groups)
}

export function excludeFinalizedNewsSections(
  sections: NewsPageSection[],
  crops: Record<string, Crop>,
  groups: Record<string, CropGroup>,
  options?: { keepNewsIds?: Iterable<string> },
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
  if (entry.kind === 'pending') return 900_000 + (entry.item.listOrder ?? 0)
  if (!entry.node.crop) return 999_000

  if (entry.node.group) {
    const onPage = entry.node.group.cropIds
      .map((id) => crops[id])
      .find((crop) => crop?.pageNumber === pageNumber)
    if (onPage) return onPage.rect.y
  }

  return entry.node.crop.rect.y
}

function findCropNodeForNews(
  news: StoredNewsItem,
  cropNodes: CropDisplayNode[],
  crops: Record<string, Crop>,
): CropDisplayNode | undefined {
  return cropNodes.find((node) => {
    const rootCrop = node.crop
    if (!rootCrop) return false
    if (rootCrop.newsItemId === news.id) return true
    if (news.cropId && (rootCrop.id === news.cropId || node.group?.cropIds.includes(news.cropId))) {
      return true
    }
    return node.group?.cropIds.some((id) => crops[id]?.newsItemId === news.id) ?? false
  })
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

  for (const news of sortNewsForPage(pageNews)) {
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
    if (!matchedNodeIds.has(node.id)) {
      entries.push({ kind: 'crop', node, newsId: node.crop?.newsItemId ?? null })
    }
  }

  return entries.sort(
    (a, b) => resolveEntrySortY(a, crops, pageNumber) - resolveEntrySortY(b, crops, pageNumber),
  )
}

export function buildNewsPageSections(
  cropSections: CropPageSection[],
  allNews: StoredNewsItem[],
  pdfId: string,
  crops: Record<string, Crop>,
): NewsPageSection[] {
  const cropByPage = new Map(cropSections.map((section) => [section.pageNumber, section.nodes]))
  const newsByPage = new Map<string, StoredNewsItem[]>()

  for (const news of allNews) {
    if (news.pdfId !== pdfId) continue
    const list = newsByPage.get(news.pageNumber) ?? []
    list.push(news)
    newsByPage.set(news.pageNumber, list)
  }

  const pageNumbers = new Set([
    ...cropSections.map((section) => section.pageNumber),
    ...newsByPage.keys(),
  ])

  return [...pageNumbers]
    .sort(comparePageKeys)
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

function buildDisplayIndices(pageSections: NewsPageSection[]) {
  const cropMap = new Map<string, CropDisplayInfo>()
  const newsMap = new Map<string, number>()
  let displayIndex = 1

  for (const section of pageSections) {
    for (const entry of section.entries) {
      const index = displayIndex++
      if (entry.kind === 'pending') {
        newsMap.set(entry.item.id, index)
        continue
      }

      const newsId = entry.newsId ?? entry.node.crop?.newsItemId
      if (newsId) newsMap.set(newsId, index)
      const node = entry.node
      const colorKey = newsId ?? node.group?.id ?? node.crop?.id ?? String(index)
      const info = cropDisplayInfoFromIndex(index, stableColorIndex(colorKey))

      if (node.type === 'group' && node.group) {
        for (const cropId of node.group.cropIds) cropMap.set(cropId, info)
      } else if (node.crop) {
        cropMap.set(node.crop.id, info)
      }
    }
  }

  return { cropMap, newsMap }
}

export function buildCropDisplayIndexMapFromNewsSections(
  pageSections: NewsPageSection[],
): Map<string, CropDisplayInfo> {
  return buildDisplayIndices(pageSections).cropMap
}

export function buildNewsDisplayIndexMap(
  pageSections: NewsPageSection[],
): Map<string, number> {
  return buildDisplayIndices(pageSections).newsMap
}

export function filterNewsPageSections(
  sections: NewsPageSection[],
  search: string,
  newsViewFilter: NewsViewFilter,
  crops: Record<string, Crop>,
): NewsPageSection[] {
  const query = search.trim().toLowerCase()

  return sections
    .map((section) => ({
      ...section,
      entries: section.entries.filter((entry) => {
        if (query) {
          const title =
            entry.kind === 'pending'
              ? entry.item.title
              : (entry.node.group?.title ?? entry.node.crop?.title ?? '')
          if (!title.toLowerCase().includes(query)) return false
        }

        if (newsViewFilter !== 'withClient') return true
        return entry.kind === 'pending'
          ? newsItemHasClient(entry.item)
          : newsDisplayNodeHasClient(entry.node, crops)
      }),
    }))
    .filter((section) => section.entries.length > 0)
}

function includeEmptyPages(
  sections: NewsPageSection[],
  pages: PageData[] | undefined,
): NewsPageSection[] {
  if (!pages?.length) return sections
  const byPage = new Map(sections.map((section) => [section.pageNumber, section]))
  return [...pages]
    .sort((a, b) => comparePageKeys(a.pageNumber, b.pageNumber))
    .map((page) => byPage.get(page.pageNumber) ?? { pageNumber: page.pageNumber, entries: [] })
}

export function resolveNewsTargetCropId(
  newsItem: StoredNewsItem,
  crops: Record<string, Crop>,
  groups: Record<string, CropGroup>,
): string | null {
  const linked =
    (newsItem.cropId ? crops[newsItem.cropId] : undefined) ??
    Object.values(crops).find((crop) => crop.newsItemId === newsItem.id)
  if (!linked) return null
  return linked.groupId && groups[linked.groupId]
    ? (groups[linked.groupId].cropIds[0] ?? linked.id)
    : linked.id
}

export function createNewsCropsViewModel(
  input: NewsCropsViewModelInput,
): NewsCropsViewModel {
  const allNews = Array.isArray(input.newsItems)
    ? input.newsItems
    : Object.values(input.newsItems)
  const pdfNews = allNews.filter((item) => item.pdfId === input.pdfId)
  const displayTree = buildCropDisplayTree(
    input.editionId,
    input.pdfId,
    input.crops,
    input.groups,
  )
  const unfilteredSections = buildNewsPageSections(
    buildCropsByPageSections(displayTree, pdfNews),
    pdfNews,
    input.pdfId,
    input.crops,
  )
  const visibleSections = excludeFinalizedNewsSections(
    unfilteredSections,
    input.crops,
    input.groups,
    input.keepNewsIds ? { keepNewsIds: input.keepNewsIds } : undefined,
  )
  const pageSections = includeEmptyPages(visibleSections, input.pages)
  const indices = buildDisplayIndices(unfilteredSections)
  const pageCrops = new Map<string, Crop[]>()
  const finalizedCropIds = new Set<string>()
  const clientCropIds = new Set<string>()

  for (const crop of Object.values(input.crops)) {
    if (crop.editionId !== input.editionId || crop.pdfId !== input.pdfId) continue
    const list = pageCrops.get(crop.pageNumber) ?? []
    list.push(crop)
    pageCrops.set(crop.pageNumber, list)
    if (isCropOrGroupFinalized(crop.id, input.crops, input.groups)) finalizedCropIds.add(crop.id)
    if (cropHasClient(crop)) clientCropIds.add(crop.id)
  }

  return {
    displayTree,
    pageSections,
    filteredPageSections: filterNewsPageSections(
      pageSections,
      input.search ?? '',
      input.newsViewFilter ?? 'all',
      input.crops,
    ),
    cropDisplayIndex: indices.cropMap,
    newsDisplayIndex: indices.newsMap,
    pageCrops,
    finalizedCropIds,
    clientCropIds,
  }
}
