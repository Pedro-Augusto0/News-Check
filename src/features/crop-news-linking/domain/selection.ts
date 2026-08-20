import type { Crop } from '@/features/crops/model'
import type { StoredNewsItem } from '@/features/news/model'
import type { CropRect } from '@/features/crops/geometry'
import { hitTestCrop } from '@/features/crops/geometry'

export type FindNewsByCropId = (cropId: string) => StoredNewsItem | undefined

export function cropBelongsToNews(
  crop: Crop,
  newsId: string,
  findNewsByCropId: FindNewsByCropId,
): boolean {
  return crop.newsItemId === newsId || findNewsByCropId(crop.id)?.id === newsId
}

export function resolveCropNewsId(
  crop: Crop,
  findNewsByCropId: FindNewsByCropId,
): string | null {
  return crop.newsItemId ?? findNewsByCropId(crop.id)?.id ?? null
}

export function filterCropsByHighlightedNews(
  crops: Crop[],
  highlightedNewsIds: Record<string, true>,
  findNewsByCropId: FindNewsByCropId,
): Crop[] {
  if (Object.keys(highlightedNewsIds).length === 0) return crops
  return crops.filter((crop) => {
    const newsId = resolveCropNewsId(crop, findNewsByCropId)
    return newsId !== null && newsId in highlightedNewsIds
  })
}

export function isMultiSelectEvent(event?: {
  ctrlKey?: boolean
  metaKey?: boolean
}): boolean {
  return !!(event?.ctrlKey || event?.metaKey)
}

export const shouldUseMultiNewsSelection = isMultiSelectEvent

export type CropPointHit =
  | { kind: 'crop'; cropId: string }
  | { kind: 'finalized' }
  | { kind: 'miss' }

export function cropRectArea(rect: CropRect): number {
  return rect.width * rect.height
}

export function hitTestCropsAtPoint(
  crops: Crop[],
  px: number,
  py: number,
  width: number,
  height: number,
  isFinalized: (cropId: string) => boolean = () => false,
): CropPointHit {
  if (width <= 0 || height <= 0) return { kind: 'miss' }
  const hits = crops.filter((crop) => hitTestCrop(px, py, crop.rect, width, height))
  if (hits.length === 0) return { kind: 'miss' }

  const target = [...hits].sort((a, b) => {
    const areaDiff = cropRectArea(a.rect) - cropRectArea(b.rect)
    return areaDiff !== 0 ? areaDiff : b.rect.y - a.rect.y
  })[0]
  return isFinalized(target.id)
    ? { kind: 'finalized' }
    : { kind: 'crop', cropId: target.id }
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
  return hit.kind === 'crop' && isInteractive(hit.cropId) ? hit.cropId : null
}

export type ImagePointerGesture = 'pointerdown' | 'dblclick'
export type ImageInteractionAction = 'ignore' | 'pan' | 'draw' | 'select-news'

export function resolveImageInteraction(input: {
  gesture: ImagePointerGesture
  isEditing: boolean
  panMode: boolean
  hitKind: CropPointHit['kind']
}): ImageInteractionAction {
  if (input.isEditing) return 'ignore'

  if (input.gesture === 'dblclick') {
    if (input.panMode) return 'ignore'
    return input.hitKind === 'crop' ? 'select-news' : 'ignore'
  }

  if (input.panMode) return 'pan'
  if (input.hitKind === 'finalized') return 'ignore'
  return 'draw'
}
