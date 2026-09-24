import type { ReviewQueueItem } from '../model'
import {
  comparePageOccurrences,
  groupBySection,
  pageIdOf,
  pageNumberFromPageId,
  resolvePageListSection,
  sectionGroupKey,
  UNSECTIONED_LABEL,
} from './group-by-section'

export interface ReviewPageGroup {
  key: string
  pageNumber: string
  section: string
  items: ReviewQueueItem[]
}

export function groupReviewQueueByPage(items: ReviewQueueItem[]): ReviewPageGroup[] {
  const map = new Map<string, ReviewQueueItem[]>()
  const meta = new Map<string, { pageNumber: string; sections: Map<string, string> }>()

  for (const item of items) {
    const pageNumber = pageNumberFromPageId(item.pageNumber)
    const section = resolvePageListSection(item)
    const key = pageIdOf(item)
    const pageItems = map.get(key) ?? []
    pageItems.push(item)
    map.set(key, pageItems)
    const existing = meta.get(key)
    if (existing) {
      const sectionKey = sectionGroupKey(section)
      if (!existing.sections.has(sectionKey)) existing.sections.set(sectionKey, section)
    } else {
      meta.set(key, {
        pageNumber,
        sections: new Map([[sectionGroupKey(section), section]]),
      })
    }
  }

  const byPage = [...map.entries()]
    .map(([key, pageItems]) => {
      const entry = meta.get(key)!
      return {
        key,
        pageNumber: entry.pageNumber,
        section: [...entry.sections.values()].join(' / '),
        items: pageItems,
      }
    })
    .sort((a, b) => comparePageOccurrences(a, b))

  return groupBySection(byPage, (group) => group.section).flatMap((section) => section.items)
}

export function pageGroupTitle(group: ReviewPageGroup, groups: ReviewPageGroup[]): string {
  const duplicated = groups.some(
    (other) => other.key !== group.key && other.pageNumber === group.pageNumber,
  )
  if (!duplicated && group.section === UNSECTIONED_LABEL) return `Página ${group.pageNumber}`
  return `Página ${group.pageNumber} · ${group.section}`
}
