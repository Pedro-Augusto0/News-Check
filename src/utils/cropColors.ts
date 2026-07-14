export const CROP_COLORS = [
  'var(--color-crop-1)',
  'var(--color-crop-2)',
  'var(--color-crop-3)',
  'var(--color-crop-4)',
  'var(--color-crop-5)',
]

export function cropColor(index: number): string {
  return CROP_COLORS[index % CROP_COLORS.length]
}
