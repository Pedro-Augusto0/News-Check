import type { Crop, CropGroup, PersistedCropState } from '../model'

export function cropStorageKey(editionId: string) {
  return `feature-crops-state-${editionId}`
}

export function loadPersistedCrops(editionId: string): PersistedCropState | null {
  try {
    localStorage.removeItem(cropStorageKey(editionId))
  } catch {
    // ignore quota / private mode
  }
  return null
}

export function savePersistedCrops(
  editionId: string,
  crops: Record<string, Crop>,
  groups: Record<string, CropGroup>,
  finalizedPages: Record<string, true>,
) {
  void crops
  void groups
  void finalizedPages
  try {
    localStorage.removeItem(cropStorageKey(editionId))
  } catch {
    // ignore quota / private mode
  }
}
