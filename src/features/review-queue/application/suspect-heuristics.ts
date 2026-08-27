import type { Crop } from '@/features/crops'
import type { CropRect } from '@/features/crops/geometry'
import type { ReviewSuspectReason } from '../model'

/** Área do recorte como % da página (rect em coordenadas percentuais). */
export function cropAreaPercent(rect: CropRect): number {
  return (rect.width * rect.height) / 100
}

function intersectionArea(a: CropRect, b: CropRect): number {
  const x = Math.max(a.x, b.x)
  const y = Math.max(a.y, b.y)
  const right = Math.min(a.x + a.width, b.x + b.width)
  const bottom = Math.min(a.y + a.height, b.y + b.height)
  const w = Math.max(0, right - x)
  const h = Math.max(0, bottom - y)
  return w * h
}

export function cropOverlapRatio(a: CropRect, b: CropRect): number {
  const overlap = intersectionArea(a, b)
  if (overlap <= 0) return 0
  const smaller = Math.min(a.width * a.height, b.width * b.height)
  if (smaller <= 0) return 0
  return overlap / smaller
}

export function detectCropSuspects(
  crop: Crop,
  pageCrops: Crop[],
): ReviewSuspectReason[] {
  const reasons: ReviewSuspectReason[] = []
  const area = cropAreaPercent(crop.rect)

  if (area < 2) reasons.push('too-small')
  if (area > 40) reasons.push('too-large')

  const minSide = Math.min(crop.rect.width, crop.rect.height)
  const maxSide = Math.max(crop.rect.width, crop.rect.height)
  if (minSide < 3 && maxSide > 20) reasons.push('thin-strip')

  const overlaps = pageCrops.some(
    (other) => other.id !== crop.id && cropOverlapRatio(crop.rect, other.rect) > 0.35,
  )
  if (overlaps) reasons.push('overlap')

  return reasons
}
