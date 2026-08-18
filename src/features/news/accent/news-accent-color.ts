import type { StoredNewsItem } from '../model'
import { cropColor, stableColorIndex } from '@/features/crops/colors'

export function resolveNewsAccentColor(newsItem: StoredNewsItem): string {
  return cropColor(stableColorIndex(newsItem.id))
}
