import type { ReviewQueueItem } from '../model'

export function canAttachNews(
  current: ReviewQueueItem | null,
  inspect: ReviewQueueItem | null,
): boolean {
  if (!current || !inspect) return false
  if (current.id === inspect.id) return false
  if (current.kind !== 'news' || inspect.kind !== 'news') return false
  return !!current.newsId && !!inspect.newsId
}
