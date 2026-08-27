import type { Crop } from '@/features/crops'
import { cropAreaPercent } from './suspect-heuristics'

export function cropCenterDistance(a: Crop, b: Crop): number {
  const ax = a.rect.x + a.rect.width / 2
  const ay = a.rect.y + a.rect.height / 2
  const bx = b.rect.x + b.rect.width / 2
  const by = b.rect.y + b.rect.height / 2
  return Math.hypot(ax - bx, ay - by)
}

/** Vizinho mais próximo na mesma página que não pertence à notícia atual. */
export function findMergeCandidate(
  current: Crop | undefined,
  pageCrops: Crop[],
  currentCropIds: Set<string>,
): Crop | null {
  if (!current) return null

  let best: Crop | null = null
  let bestScore = Infinity

  for (const other of pageCrops) {
    if (currentCropIds.has(other.id)) continue
    const distance = cropCenterDistance(current, other)
    const areaPenalty = Math.abs(cropAreaPercent(current.rect) - cropAreaPercent(other.rect)) * 0.15
    const score = distance + areaPenalty
    if (score < bestScore) {
      bestScore = score
      best = other
    }
  }

  return best
}
