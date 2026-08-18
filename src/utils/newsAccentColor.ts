import type { StoredNewsItem } from '@/types/session'
import { cropColor, stableColorIndex } from '@/utils/cropColors'

export function resolveNewsAccentColor(newsItem: StoredNewsItem): string {
  return cropColor(stableColorIndex(newsItem.id))
}
