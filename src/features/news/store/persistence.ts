import type { StoredNewsItem } from '../model'

export interface PersistedNewsState {
  items: Record<string, StoredNewsItem>
}

export function newsStorageKey(editionId: string) {
  return `feature-crops-news-${editionId}`
}

export function loadPersistedNews(editionId: string): PersistedNewsState | null {
  try {
    localStorage.removeItem(newsStorageKey(editionId))
  } catch {
    // ignore quota / private mode
  }
  return null
}

export function savePersistedNews(
  editionId: string,
  items: Record<string, StoredNewsItem>,
) {
  void items
  try {
    localStorage.removeItem(newsStorageKey(editionId))
  } catch {
    // ignore quota / private mode
  }
}
