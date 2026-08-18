import type { Crop, CropGroup, PersistedCropState } from '../model'

export function cropStorageKey(editionId: string) {
  return `feature-crops-state-${editionId}`
}

export function loadPersistedCrops(editionId: string): PersistedCropState | null {
  try {
    const raw = localStorage.getItem(cropStorageKey(editionId))
    return raw ? (JSON.parse(raw) as PersistedCropState) : null
  } catch {
    return null
  }
}

export function savePersistedCrops(
  editionId: string,
  crops: Record<string, Crop>,
  groups: Record<string, CropGroup>,
  finalizedPages: Record<string, true>,
) {
  const editionCrops = Object.fromEntries(
    Object.entries(crops).filter(([, crop]) => crop.editionId === editionId),
  )
  const editionGroups = Object.fromEntries(
    Object.entries(groups).filter(([, group]) => group.editionId === editionId),
  )
  localStorage.setItem(
    cropStorageKey(editionId),
    JSON.stringify({ crops: editionCrops, groups: editionGroups, finalizedPages }),
  )
}
