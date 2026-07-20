import type { StoredNewsItem } from '@/types/session'

export function isManualNewsItem(item: Pick<StoredNewsItem, 'manual'> | undefined): boolean {
  return item?.manual === true
}

export function canDeleteNewsItem(item: Pick<StoredNewsItem, 'manual'> | undefined): boolean {
  return isManualNewsItem(item)
}
