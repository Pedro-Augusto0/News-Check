import type { Crop, CropGroup, StoredNewsItem } from '@/types/session'
import type { CropDisplayInfo } from '@/utils/cropDisplayTree'
import { cropColor } from '@/utils/cropColors'
import { resolveCropDisplayIndex } from '@/utils/cropDisplayIndex'

export function resolveNewsAccentColor(
  newsItem: StoredNewsItem,
  crops: Record<string, Crop>,
  groups: Record<string, CropGroup>,
  cropDisplayIndex: Map<string, CropDisplayInfo>,
): string {
  let cropId = newsItem.cropId

  if (!cropId || !crops[cropId]) {
    const linked = Object.values(crops).find((crop) => crop.newsItemId === newsItem.id)
    if (linked) {
      cropId =
        linked.groupId && groups[linked.groupId]
          ? groups[linked.groupId].cropIds[0]
          : linked.id
    }
  }

  if (cropId && crops[cropId]) {
    const info = cropDisplayIndex.get(cropId)
    if (info) return cropColor(info.colorIndex)
    return cropColor(resolveCropDisplayIndex(crops[cropId], crops) - 1)
  }

  return 'var(--color-pending)'
}
