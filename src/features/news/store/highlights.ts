import type { StoredNewsItem } from '../model'
import type { NewsHighlightScope, NewsPageHighlightMap } from './state-types'

export function resolveHighlightScope(
  items: Record<string, StoredNewsItem>,
  newsId: string,
  scope?: NewsHighlightScope,
): NewsHighlightScope | null {
  if (scope) return scope
  const item = items[newsId]
  return item ? { pdfId: item.pdfId, pageNumber: item.pageNumber } : null
}

export function setPageHighlights(
  byPage: NewsPageHighlightMap,
  key: string,
  pageSet: Record<string, true>,
): NewsPageHighlightMap {
  const next = { ...byPage }
  if (Object.keys(pageSet).length === 0) delete next[key]
  else next[key] = pageSet
  return next
}

export function removeNewsIdsFromHighlights(
  byPage: NewsPageHighlightMap,
  newsIds: Iterable<string>,
  replaceWithId?: string | null,
): NewsPageHighlightMap {
  const removeSet = new Set(newsIds)
  if (removeSet.size === 0) return byPage
  let changed = false
  const next: NewsPageHighlightMap = {}

  for (const [key, pageSet] of Object.entries(byPage)) {
    const updated: Record<string, true> = {}
    let pageChanged = false
    let replaced = false
    for (const id of Object.keys(pageSet)) {
      if (!removeSet.has(id)) {
        updated[id] = true
      } else {
        pageChanged = true
        if (replaceWithId && !replaced) {
          updated[replaceWithId] = true
          replaced = true
        }
      }
    }
    if (pageChanged) changed = true
    if (Object.keys(updated).length > 0) next[key] = pageChanged ? updated : pageSet
  }
  return changed ? next : byPage
}
