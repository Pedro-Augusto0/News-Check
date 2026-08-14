import type { Crop, StoredNewsItem } from '@/types/session'
import { hitTestCrop } from '@/utils/cropGeometry'
import { useCropsStore } from '@/stores/cropsStore'
import { useNewsStore, type NewsHighlightScope } from '@/stores/newsStore'

export function cropBelongsToNews(
  crop: Crop,
  newsId: string,
  findNewsByCropId: (cropId: string) => StoredNewsItem | undefined,
): boolean {
  if (crop.newsItemId === newsId) return true
  return findNewsByCropId(crop.id)?.id === newsId
}

export function resolveCropNewsId(
  crop: Crop,
  findNewsByCropId: (cropId: string) => StoredNewsItem | undefined,
): string | null {
  if (crop.newsItemId) return crop.newsItemId
  return findNewsByCropId(crop.id)?.id ?? null
}

/** Sem seleção de destaque nesta página → mostra todos; com seleção → só as escolhidas. */
export function filterCropsByHighlightedNews(
  crops: Crop[],
  highlightedNewsIds: Record<string, true>,
  findNewsByCropId: (cropId: string) => StoredNewsItem | undefined,
): Crop[] {
  if (Object.keys(highlightedNewsIds).length === 0) return crops

  return crops.filter((crop) => {
    const newsId = resolveCropNewsId(crop, findNewsByCropId)
    return newsId !== null && newsId in highlightedNewsIds
  })
}

export function clearNewsHighlight(scope?: NewsHighlightScope): void {
  useNewsStore.getState().clearNewsHighlight(scope)
}

export function selectNewsHighlight(
  newsId: string,
  multi: boolean,
  scope?: NewsHighlightScope,
): void {
  useNewsStore.getState().selectNewsHighlight(newsId, multi, scope)
}

export function isMultiSelectEvent(event?: { ctrlKey?: boolean; metaKey?: boolean }): boolean {
  return !!(event?.ctrlKey || event?.metaKey)
}

export function hasActiveNewsHighlight(scope?: NewsHighlightScope): boolean {
  if (!scope) return false
  return useNewsStore.getState().hasPageNewsHighlight(scope.pdfId, scope.pageNumber)
}

/** Na imagem, clique em outra notícia da mesma página soma ao filtro ativo; Ctrl continua valendo na lista. */
export function shouldUseMultiNewsSelection(
  event?: { ctrlKey?: boolean; metaKey?: boolean },
  scope?: NewsHighlightScope,
): boolean {
  return isMultiSelectEvent(event) || hasActiveNewsHighlight(scope)
}

export function findCropAtPoint(
  crops: Crop[],
  px: number,
  py: number,
  width: number,
  height: number,
): string | null {
  if (width <= 0 || height <= 0) return null

  for (let i = crops.length - 1; i >= 0; i--) {
    const crop = crops[i]
    if (hitTestCrop(px, py, crop.rect, width, height)) return crop.id
  }

  return null
}

export function handleImageNewsHighlightAtPoint(
  crops: Crop[],
  px: number,
  py: number,
  width: number,
  height: number,
  event?: { ctrlKey?: boolean; metaKey?: boolean },
  scope?: NewsHighlightScope,
): boolean {
  if (!hasActiveNewsHighlight(scope)) return false

  const cropId = findCropAtPoint(crops, px, py, width, height)
  if (!cropId) return false

  handleCropListSelection(cropId, shouldUseMultiNewsSelection(event, scope), scope)
  return true
}

export function shouldClearNewsHighlight(
  newsId: string,
  multi: boolean,
  scope?: NewsHighlightScope,
): boolean {
  if (multi) return false
  const store = useNewsStore.getState()
  const item = store.items[newsId]
  const resolved = scope ?? (item ? { pdfId: item.pdfId, pageNumber: item.pageNumber } : undefined)
  if (!resolved) return false
  const highlightedNewsIds = store.getPageHighlights(resolved.pdfId, resolved.pageNumber)
  return newsId in highlightedNewsIds && Object.keys(highlightedNewsIds).length === 1
}

export function handleNewsListSelection(
  newsId: string,
  multi: boolean,
  onActivate: () => void,
  scope?: NewsHighlightScope,
): void {
  if (shouldClearNewsHighlight(newsId, multi, scope)) {
    useNewsStore.getState().selectNewsItem(null)
    useCropsStore.getState().selectCrop(null)
    clearNewsHighlight(scope)
    return
  }

  onActivate()
  selectNewsHighlight(newsId, multi, scope)
}

export function handleCropListSelection(
  cropId: string,
  multi: boolean,
  scope?: NewsHighlightScope,
): void {
  const crop = useCropsStore.getState().crops[cropId]
  if (!crop) return

  const newsId = useNewsStore.getState().ensureNewsForCrop(cropId)
  if (!newsId) {
    useCropsStore.getState().selectCrop(cropId)
    return
  }

  const cropScope = scope ?? { pdfId: crop.pdfId, pageNumber: crop.pageNumber }

  handleNewsListSelection(newsId, multi, () => {
    useCropsStore.getState().selectCrop(cropId)
    useNewsStore.getState().selectNewsItem(newsId)
  }, cropScope)
}
