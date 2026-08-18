import type { Crop } from '@/features/crops/model'
import { useCropsStore } from '@/features/crops/store'
import { useNewsStore, type NewsHighlightScope } from '@/features/news/store'
import {
  hitTestCropsAtPoint,
  shouldUseMultiNewsSelection,
} from '../domain/selection'

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

export function hasActiveNewsHighlight(scope?: NewsHighlightScope): boolean {
  return !!scope && useNewsStore.getState().hasPageNewsHighlight(scope.pdfId, scope.pageNumber)
}

export function isNewsFinalized(newsId: string): boolean {
  const item = useNewsStore.getState().items[newsId]
  const cropsStore = useCropsStore.getState()
  if (item?.cropId && cropsStore.isNewsItemFinalized(item.cropId)) return true
  return Object.values(cropsStore.crops).some(
    (crop) => crop.newsItemId === newsId && cropsStore.isNewsItemFinalized(crop.id),
  )
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
  const highlights = store.getPageHighlights(resolved.pdfId, resolved.pageNumber)
  return newsId in highlights && Object.keys(highlights).length === 1
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
  const cropsStore = useCropsStore.getState()
  const crop = cropsStore.crops[cropId]
  if (!crop || cropsStore.isNewsItemFinalized(cropId)) return

  const newsId = useNewsStore.getState().ensureNewsForCrop(cropId)
  if (!newsId) {
    cropsStore.selectCrop(cropId)
    return
  }

  handleNewsListSelection(
    newsId,
    multi,
    () => {
      cropsStore.selectCrop(cropId)
      useNewsStore.getState().selectNewsItem(newsId)
    },
    scope ?? { pdfId: crop.pdfId, pageNumber: crop.pageNumber },
  )
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
  const hit = hitTestCropsAtPoint(
    crops,
    px,
    py,
    width,
    height,
    (cropId) => useCropsStore.getState().isNewsItemFinalized(cropId),
  )
  if (hit.kind === 'finalized') return true
  if (hit.kind === 'miss' || !hasActiveNewsHighlight(scope)) return false
  handleCropListSelection(hit.cropId, shouldUseMultiNewsSelection(event), scope)
  return true
}
