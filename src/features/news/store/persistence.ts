import type { StoredNewsItem } from '../model'

export interface PersistedNewsState {
  items: Record<string, StoredNewsItem>
}

export function newsStorageKey(editionId: string) {
  return `feature-crops-news-${editionId}`
}

export function loadPersistedNews(editionId: string): PersistedNewsState | null {
  try {
    const raw = localStorage.getItem(newsStorageKey(editionId))
    return raw ? (JSON.parse(raw) as PersistedNewsState) : null
  } catch {
    return null
  }
}

export function savePersistedNews(
  editionId: string,
  items: Record<string, StoredNewsItem>,
) {
  const editionItems = Object.fromEntries(
    Object.entries(items).filter(([, item]) => item.editionId === editionId),
  )
  localStorage.setItem(newsStorageKey(editionId), JSON.stringify({ items: editionItems }))
}
