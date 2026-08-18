import type { Crop } from '../model'
import { comparePageKeys } from '@/features/page-navigation/page-key'

export function sortCropIds(crops: Record<string, Crop>, ids: string[]): string[] {
  return [...ids].sort((a, b) => {
    const first = crops[a]
    const second = crops[b]
    if (!first || !second) return 0
    if (first.pageNumber !== second.pageNumber) {
      return comparePageKeys(first.pageNumber, second.pageNumber)
    }
    return first.rect.y - second.rect.y
  })
}
