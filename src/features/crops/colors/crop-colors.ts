export const CROP_COLORS = [
  'var(--color-crop-1)',
  'var(--color-crop-2)',
  'var(--color-crop-3)',
  'var(--color-crop-4)',
  'var(--color-crop-5)',
  'var(--color-crop-6)',
  'var(--color-crop-7)',
  'var(--color-crop-8)',
  'var(--color-crop-9)',
  'var(--color-crop-10)',
  'var(--color-crop-11)',
  'var(--color-crop-12)',
  'var(--color-crop-13)',
  'var(--color-crop-14)',
  'var(--color-crop-15)',
  'var(--color-crop-16)',
]

export function cropColor(index: number): string {
  return CROP_COLORS[((index % CROP_COLORS.length) + CROP_COLORS.length) % CROP_COLORS.length]
}

/** Cor estável a partir de um id de notícia/corte — não muda ao incluir ou excluir recortes. */
export function stableColorIndex(key: string): number {
  let hash = 2166136261
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (Math.imul(hash, 2654435761) >>> 0) % CROP_COLORS.length
}
