import type { Crop, CropGroup } from '../model'
import { pageFinalizationKey } from '@/features/page-navigation/finalization'
import { getRelatedCropIds } from './relations'

export function reopenPageInState(
  finalizedPages: Record<string, true>,
  pdfId: string,
  pageNumber: string,
): Record<string, true> {
  const key = pageFinalizationKey(pdfId, pageNumber)
  if (!finalizedPages[key]) return finalizedPages
  const next = { ...finalizedPages }
  delete next[key]
  return next
}

export function finalizeNewsItemsOnPage(
  crops: Record<string, Crop>,
  groups: Record<string, CropGroup>,
  pdfId: string,
  pageNumber: string,
): Record<string, Crop> {
  const pageCrops = Object.values(crops).filter(
    (crop) => crop.pdfId === pdfId && crop.pageNumber === pageNumber,
  )
  const processed = new Set<string>()
  const next = { ...crops }

  for (const crop of pageCrops) {
    const key = crop.groupId ?? crop.id
    if (processed.has(key)) continue
    processed.add(key)
    for (const id of getRelatedCropIds(crop.id, crops, groups)) {
      if (next[id]) next[id] = { ...next[id], finalized: true }
    }
  }
  return next
}
