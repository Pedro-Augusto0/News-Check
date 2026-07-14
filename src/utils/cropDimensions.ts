import type { CropRect } from '@/utils/cropGeometry'

const PAGE_WIDTH_CM = 21
const PAGE_HEIGHT_CM = 29.7

export function formatCropDimensions(rect: CropRect): string {
  const w = ((rect.width / 100) * PAGE_WIDTH_CM).toFixed(1).replace('.', ',')
  const h = ((rect.height / 100) * PAGE_HEIGHT_CM).toFixed(1).replace('.', ',')
  return `${w} x ${h} cm`
}
