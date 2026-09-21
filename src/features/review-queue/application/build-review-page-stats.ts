import type { PageData } from '@/features/page-navigation'
import {
  comparePageOccurrences,
  pageIdOf,
  pageNumberFromPageId,
  resolvePageId,
  resolvePageListSection,
  sectionGroupKey,
} from '@/features/page-navigation/page-key'
import type { ReviewQueueItem, ReviewStatus } from '../model'

export interface ReviewPageStat {
  key: string
  pageNumber: string
  total: number
  pending: number
  newsCount: number
  clientCount: number
  clientNewsCount: number
  hasClient: boolean
  hasOwnChannel: boolean
  hasSuspect: boolean
  reviewed: boolean
  publicationPageId?: number
  section: string
  itemCount: number
}

function isPending(status: ReviewStatus | undefined): boolean {
  return status !== 'approved' && status !== 'rejected'
}

function newsHasOwnChannel(item: ReviewQueueItem): boolean {
  if (item.kind !== 'news') return false
  return (
    item.hasOwnChannel === true ||
    item.clientMatches.some((match) => match.ownChannel === true)
  )
}

function toStat(
  key: string,
  pageNumber: string,
  section: string,
  pageItems: ReviewQueueItem[],
  statuses: Record<string, ReviewStatus>,
  pageMeta: { publicationPageId?: number; finished?: boolean } = {},
): ReviewPageStat {
  const pendingItems = pageItems.filter((item) => isPending(statuses[item.id]))
  const clientNewsCount = pageItems.filter((item) => item.hasClient).length
  const newsCount = pageItems.filter((item) => item.kind === 'news').length
  const hasOwnChannel = pageItems.some(newsHasOwnChannel)

  return {
    key,
    pageNumber,
    section,
    total: pendingItems.length,
    pending: pendingItems.length,
    newsCount,
    clientCount: clientNewsCount,
    clientNewsCount,
    hasClient: clientNewsCount > 0,
    hasOwnChannel,
    hasSuspect: pendingItems.some((item) => item.suspectReasons.length > 0),
    reviewed: pageMeta.finished === true,
    publicationPageId: pageMeta.publicationPageId,
    itemCount: pageItems.length,
  }
}

function pageByKey(pages: PageData[], key: string): PageData | undefined {
  return pages.find((page) => resolvePageId(page) === key)
}

function groupPageMeta(pages: PageData[], pageIds: Iterable<string>) {
  let publicationPageId: number | undefined
  let finished = false
  for (const key of pageIds) {
    const page = pageByKey(pages, key)
    if (!page) continue
    if (publicationPageId == null && page.publicationPageId != null) {
      publicationPageId = page.publicationPageId
    }
    if (page.finished) finished = true
  }
  return { publicationPageId, finished }
}

export function buildReviewPageStats(input: {
  pages: PageData[]
  queue: ReviewQueueItem[]
  statuses: Record<string, ReviewStatus>
}): ReviewPageStat[] {
  const itemsByKey = new Map<string, ReviewQueueItem[]>()
  for (const item of input.queue) {
    const key = pageIdOf(item)
    const list = itemsByKey.get(key) ?? []
    list.push(item)
    itemsByKey.set(key, list)
  }

  const stats: ReviewPageStat[] = []
  const seen = new Set<string>()
  const pageGroups = new Map<
    string,
    {
      key: string
      pageNumber: string
      pageIds: Set<string>
      sections: Map<string, string>
    }
  >()

  for (const page of input.pages) {
    const key = resolvePageId(page)
    seen.add(key)
    const filePath = page.filePath?.trim()
    const groupKey = filePath ? `file:${filePath}` : `page:${key}`
    const section = resolvePageListSection(page)
    const existing = pageGroups.get(groupKey)
    if (existing) {
      existing.pageIds.add(key)
      const sectionKey = sectionGroupKey(section)
      if (!existing.sections.has(sectionKey)) existing.sections.set(sectionKey, section)
      continue
    }
    pageGroups.set(groupKey, {
      key,
      pageNumber: page.pageNumber,
      pageIds: new Set([key]),
      sections: new Map([[sectionGroupKey(section), section]]),
    })
  }

  for (const group of pageGroups.values()) {
    const pageItems = [...group.pageIds].flatMap((key) => itemsByKey.get(key) ?? [])
    stats.push(
      toStat(
        group.key,
        group.pageNumber,
        [...group.sections.values()].join(' / '),
        pageItems,
        input.statuses,
        groupPageMeta(input.pages, group.pageIds),
      ),
    )
  }

  for (const [key, pageItems] of itemsByKey) {
    if (seen.has(key)) continue
    const first = pageItems[0]
    if (!first) continue
    stats.push(
      toStat(
        key,
        pageNumberFromPageId(first.pageNumber),
        resolvePageListSection(first),
        pageItems,
        input.statuses,
        groupPageMeta(input.pages, [key]),
      ),
    )
  }

  return stats.sort((a, b) => comparePageOccurrences(a, b))
}
