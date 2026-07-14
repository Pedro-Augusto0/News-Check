import type { Crop } from '@/types/session'
import type { CropDisplayInfo } from '@/utils/cropDisplayTree'

function sortCropsByPagePosition(crops: Crop[]): Crop[] {
  return [...crops].sort((a, b) => {
    if (a.pageNumber !== b.pageNumber) return a.pageNumber - b.pageNumber
    return a.rect.y - b.rect.y
  })
}

export function cropDisplayInfoFromIndex(displayIndex: number): CropDisplayInfo {
  return { displayIndex, colorIndex: displayIndex - 1 }
}

export function nextDisplayIndex(
  crops: Record<string, Crop>,
  editionId: string,
  pdfId: string,
): number {
  let max = 0
  for (const crop of Object.values(crops)) {
    if (crop.editionId !== editionId || crop.pdfId !== pdfId) continue
    if (typeof crop.displayIndex === 'number' && crop.displayIndex > max) {
      max = crop.displayIndex
    }
  }
  return max + 1
}

/** Garante displayIndex persistente para dados antigos sem o campo. */
export function ensureDisplayIndices(
  crops: Record<string, Crop>,
  editionId: string,
): Record<string, Crop> {
  const byPdf = new Map<string, Crop[]>()

  for (const crop of Object.values(crops)) {
    if (crop.editionId !== editionId) continue
    const list = byPdf.get(crop.pdfId) ?? []
    list.push(crop)
    byPdf.set(crop.pdfId, list)
  }

  let changed = false
  const next = { ...crops }

  for (const pdfCrops of byPdf.values()) {
    const withIndex = pdfCrops.filter(
      (c) => typeof c.displayIndex === 'number' && c.displayIndex > 0,
    )
    const without = pdfCrops.filter(
      (c) => typeof c.displayIndex !== 'number' || c.displayIndex <= 0,
    )

    if (without.length === 0) continue

    if (withIndex.length === 0) {
      for (const [i, crop] of sortCropsByPagePosition(pdfCrops).entries()) {
        const displayIndex = i + 1
        if (next[crop.id].displayIndex !== displayIndex) {
          next[crop.id] = { ...next[crop.id], displayIndex }
          changed = true
        }
      }
      continue
    }

    let nextIndex = Math.max(...withIndex.map((c) => c.displayIndex!)) + 1
    for (const crop of sortCropsByPagePosition(without)) {
      next[crop.id] = { ...next[crop.id], displayIndex: nextIndex }
      nextIndex += 1
      changed = true
    }
  }

  return changed ? next : crops
}

export function resolveCropDisplayIndex(
  crop: Crop | undefined,
  crops: Record<string, Crop>,
): number {
  if (!crop) return 1
  if (typeof crop.displayIndex === 'number' && crop.displayIndex > 0) {
    return crop.displayIndex
  }
  return nextDisplayIndex(crops, crop.editionId, crop.pdfId)
}
