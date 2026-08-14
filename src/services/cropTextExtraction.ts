import { useCropsStore } from '@/stores/cropsStore'
import { useNewsStore } from '@/stores/newsStore'
import { extractCropContent, type CropExtractionResult } from '@/services/textExtractor'
import { isDefaultCropTitle } from '@/utils/detectTitle'
import { comparePageKeys } from '@/utils/pageKey'
import type { Crop, VehicleEdition } from '@/types/session'

function setExtracting(id: string, extracting: boolean) {
  useCropsStore.getState().setTextExtracting(id, extracting)
}

/** Resolve a URL da imagem da página onde o corte foi feito. */
export function resolveCropImageUrl(
  crop: Crop,
  editions: VehicleEdition[],
): string | undefined {
  const edition = editions.find((item) => item.id === crop.editionId)
  const pdf = edition?.pdfs.find((item) => item.id === crop.pdfId)
  const page = pdf?.pages.find((item) => item.pageNumber === crop.pageNumber)
  return page?.imageUrl || undefined
}

/** @deprecated Use resolveCropImageUrl */
export const resolveCropPdfUrl = resolveCropImageUrl

function syncNewsTitleFromCrop(crop: Crop, detectedTitle: string) {
  if (!crop.newsItemId) return
  const newsItem = useNewsStore.getState().getNewsItem(crop.newsItemId)
  if (newsItem && isDefaultCropTitle(newsItem.title)) {
    useNewsStore.getState().updateNewsItemTitle(crop.newsItemId, detectedTitle)
  }
}

function applyCropExtraction(crop: Crop, result: CropExtractionResult) {
  const store = useCropsStore.getState()
  store.updateCropText(crop.id, result.text)
  if (isDefaultCropTitle(crop.title) && result.title) {
    store.updateCropTitle(crop.id, result.title)
    syncNewsTitleFromCrop(crop, result.title)
  }
  if (crop.newsItemId && result.text.trim()) {
    useNewsStore.getState().updateNewsItemText(crop.newsItemId, result.text)
  }
}

export async function extractAndSaveCropText(
  crop: Crop,
  imageUrl: string,
): Promise<CropExtractionResult> {
  setExtracting(crop.id, true)
  try {
    const result = await extractCropContent(imageUrl, crop.rect)
    applyCropExtraction(crop, result)
    return result
  } finally {
    setExtracting(crop.id, false)
  }
}

export async function extractAndSaveModalText(
  modalId: string,
  modalCrops: Crop[],
  resolveImageUrl: (crop: Crop) => string | undefined,
): Promise<void> {
  const store = useCropsStore.getState()
  const isGroup = !!store.groups[modalId]

  setExtracting(modalId, true)
  try {
    const parts: string[] = []
    let detectedTitle = ''

    for (const crop of modalCrops) {
      const imageUrl = resolveImageUrl(crop)
      if (!imageUrl) continue
      const result = await extractCropContent(imageUrl, crop.rect)
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
        const rootCrop = store.crops[group.cropIds[0]]
        if (rootCrop) syncNewsTitleFromCrop(rootCrop, detectedTitle)
      }
      const rootCrop = group ? store.crops[group.cropIds[0]] : undefined
      if (rootCrop?.newsItemId && combined.trim()) {
        useNewsStore.getState().updateNewsItemText(rootCrop.newsItemId, combined)
      }
    }
  } finally {
    setExtracting(modalId, false)
  }
}

export async function extractAndSaveGroupText(
  groupId: string,
  resolveImageUrl: (crop: Crop) => string | undefined,
): Promise<void> {
  const store = useCropsStore.getState()
  const group = store.groups[groupId]
  if (!group) return

  const modalCrops = group.cropIds
    .map((id) => store.crops[id])
    .filter(Boolean)
    .sort((a, b) => {
      if (a.pageNumber !== b.pageNumber) return comparePageKeys(a.pageNumber, b.pageNumber)
      return a.rect.y - b.rect.y
    })

  await extractAndSaveModalText(groupId, modalCrops, resolveImageUrl)
}
