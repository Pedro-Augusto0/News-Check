import type { Crop, CropGroup } from '../model'

export function getRelatedCropIds(
  cropId: string,
  crops: Record<string, Crop>,
  groups: Record<string, CropGroup>,
): string[] {
  const crop = crops[cropId]
  if (!crop) return []
  if (crop.groupId && groups[crop.groupId]) {
    return groups[crop.groupId].cropIds.filter((id) => crops[id])
  }
  return [cropId]
}
