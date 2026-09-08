import { discardNewsArticles } from '@/features/publication-api/news/discard-news-api'
import type { StoredNewsItem } from '@/features/news'
import type { ReviewQueueItem } from '../model'
import { resolveArticleIds } from '@/features/publication-api/news/create-news-request'

export function resolveDiscardArticleIds(
  item: ReviewQueueItem,
  newsItems: Record<string, StoredNewsItem>,
): number[] {
  if (!item.newsId) return []
  return resolveArticleIds(newsItems[item.newsId])
}

export async function commitDiscardNews(
  item: ReviewQueueItem,
  newsItems: Record<string, StoredNewsItem>,
): Promise<void> {
  const articleIds = resolveDiscardArticleIds(item, newsItems)
  if (articleIds.length === 0) return
  await discardNewsArticles(articleIds)
}
