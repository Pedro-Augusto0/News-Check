import { useCropsStore } from '@/stores/cropsStore'
import { extractCropContent, type CropExtractionResult } from '@/services/textExtractor'
import { isDefaultCropTitle } from '@/utils/detectTitle'
import type { Crop } from '@/types/session'

function setExtracting(id: string, extracting: boolean) {
  useCropsStore.getState().setTextExtracting(id, extracting)
}

function applyCropExtraction(crop: Crop, result: CropExtractionResult) {
  const store = useCropsStore.getState()
  store.updateCropText(crop.id, result.text)
  if (isDefaultCropTitle(crop.title) && result.title) {
    store.updateCropTitle(crop.id, result.title)
  }
}

export async function extractAndSaveCropText(
  crop: Crop,
  pdfUrl: string,
): Promise<CropExtractionResult> {
  setExtracting(crop.id, true)
  try {
    const result = await extractCropContent(pdfUrl, crop.pageNumber, crop.rect)
    applyCropExtraction(crop, result)
    return result
  } finally {
    setExtracting(crop.id, false)
  }
}

export async function extractAndSaveModalText(
  modalId: string,
  modalCrops: Crop[],
  resolvePdfUrl: (crop: Crop) => string | undefined,
): Promise<void> {
  const store = useCropsStore.getState()
  const isGroup = !!store.groups[modalId]

  setExtracting(modalId, true)
  try {
    const parts: string[] = []
    let detectedTitle = ''

    for (const crop of modalCrops) {
      const pdfUrl = resolvePdfUrl(crop)
      if (!pdfUrl) continue
      const result = await extractCropContent(pdfUrl, crop.pageNumber, crop.rect)
      if (result.text) parts.push(result.text)
      if (!detectedTitle && result.title) detectedTitle = result.title
      if (!isGroup) applyCropExtraction(crop, result)
    }

    const combined = parts.join('\n\n')
    if (isGroup) {
      store.updateGroupText(modalId, combined)
      const group = store.groups[modalId]
      if (group && isDefaultCropTitle(group.title) && detectedTitle) {
        store.updateGroupTitle(modalId, detectedTitle)
      }
    }
  } finally {
    setExtracting(modalId, false)
  }
}
