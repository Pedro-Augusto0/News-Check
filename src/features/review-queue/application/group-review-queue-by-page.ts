import { comparePageKeys } from '@/features/page-navigation/page-key'
import type { ReviewQueueItem } from '../model'

export interface ReviewPageGroup {
  pageNumber: string
  items: ReviewQueueItem[]
}

export function groupReviewQueueByPage(items: ReviewQueueItem[]): ReviewPageGroup[] {
  const map = new Map<string, ReviewQueueItem[]>()

  for (const item of items) {
    const pageItems = map.get(item.pageNumber) ?? []
    pageItems.push(item)
    map.set(item.pageNumber, pageItems)
  }

  return [...map.entries()]
    .sort(([a], [b]) => comparePageKeys(a, b))
    .map(([pageNumber, pageItems]) => ({ pageNumber, items: pageItems }))
}
