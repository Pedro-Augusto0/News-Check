import type { Crop } from '../model'

export function canMergeCrops(
  source: Crop | undefined,
  target: Crop | undefined,
  isFinalized: (cropId: string) => boolean,
): boolean {
  if (!source || !target || source.id === target.id) return false
  if (source.groupId && source.groupId === target.groupId) return false
  if (isFinalized(source.id) || isFinalized(target.id)) return false
  return true
}
