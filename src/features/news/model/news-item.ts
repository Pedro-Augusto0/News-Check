import type { StoredNewsItem } from './news-types'

export function isManualNewsItem(item: Pick<StoredNewsItem, 'manual'> | undefined): boolean {
  return item?.manual === true
}

export function canDeleteNewsItem(item: Pick<StoredNewsItem, 'manual'> | undefined): boolean {
  return isManualNewsItem(item)
}
