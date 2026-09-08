import { apiFetch } from '../http/api-client'

export const DISCARD_NEWS_PATH = '/printed-clipping/Info4AINews/news/discard'

export async function discardNews(articleId: number): Promise<boolean> {
  const params = new URLSearchParams({ articleId: String(articleId) })
  return apiFetch<boolean>(`${DISCARD_NEWS_PATH}?${params.toString()}`, {
    method: 'POST',
    body: '',
    headers: { accept: 'application/json' },
  })
}

export async function discardNewsArticles(articleIds: number[]): Promise<void> {
  const unique = [...new Set(articleIds.filter((id) => id > 0))]
  for (const articleId of unique) {
    await discardNews(articleId)
  }
}
