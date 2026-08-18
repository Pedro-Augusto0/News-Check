import type { Crop, StoredNewsItem } from '@/types/session'
import type { CropRect } from '@/utils/cropGeometry'
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

/** Na imagem e nos cortes, Ctrl/Cmd soma ou remove do filtro; sem modificador substitui a seleção. */
export function shouldUseMultiNewsSelection(
  event?: { ctrlKey?: boolean; metaKey?: boolean },
): boolean {
  return isMultiSelectEvent(event)
}

export function isNewsFinalized(newsId: string): boolean {
  const item = useNewsStore.getState().items[newsId]
  const cropsStore = useCropsStore.getState()

  if (item?.cropId && cropsStore.isNewsItemFinalized(item.cropId)) return true

  return Object.values(cropsStore.crops).some(
    (crop) => crop.newsItemId === newsId && cropsStore.isNewsItemFinalized(crop.id),
  )
}

export type CropPointHit =
  | { kind: 'crop'; cropId: string }
  | { kind: 'finalized' }
  | { kind: 'miss' }

export function cropRectArea(rect: CropRect): number {
  return rect.width * rect.height
}

function collectCropsAtPoint(
  crops: Crop[],
  px: number,
  py: number,
  width: number,
  height: number,
): Crop[] {
  return crops.filter((crop) => hitTestCrop(px, py, crop.rect, width, height))
}

/** Em sobreposição, a menor área vence — costuma ser a notícia mais específica. */
function pickTopmostCropAtPoint(hits: Crop[]): Crop {
  return [...hits].sort((a, b) => {
    const areaDiff = cropRectArea(a.rect) - cropRectArea(b.rect)
    if (areaDiff !== 0) return areaDiff
    return b.rect.y - a.rect.y
  })[0]
}

export function hitTestCropsAtPoint(
  crops: Crop[],
  px: number,
  py: number,
  width: number,
  height: number,
): CropPointHit {
  if (width <= 0 || height <= 0) return { kind: 'miss' }

  const hits = collectCropsAtPoint(crops, px, py, width, height)
  if (hits.length === 0) return { kind: 'miss' }

  const target = pickTopmostCropAtPoint(hits)
  if (useCropsStore.getState().isNewsItemFinalized(target.id)) {
    return { kind: 'finalized' }
  }

  return { kind: 'crop', cropId: target.id }
}

export function findCropAtPoint(
  crops: Crop[],
  px: number,
  py: number,
  width: number,
  height: number,
  isInteractive: (cropId: string) => boolean = () => true,
): string | null {
  const hit = hitTestCropsAtPoint(crops, px, py, width, height)
  if (hit.kind !== 'crop') return null
  return isInteractive(hit.cropId) ? hit.cropId : null
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
  const hit = hitTestCropsAtPoint(crops, px, py, width, height)
  if (hit.kind === 'finalized') return true
  if (hit.kind === 'miss') return false
  if (!hasActiveNewsHighlight(scope)) return false

  handleCropListSelection(hit.cropId, shouldUseMultiNewsSelection(event), scope)
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
  if (isNewsFinalized(newsId)) return

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
  if (useCropsStore.getState().isNewsItemFinalized(cropId)) return

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
