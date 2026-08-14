import type { CropRect } from '@/utils/cropGeometry'

/**
 * Converte `coordinates` da API em retângulo percentual (0–100).
 *
 * Formato Info4 / modelos de visão (Gemini-style), escala 0–1000 inteiros:
 *   `yminNorm,xminNorm,ymaxNorm,xmaxNorm`
 *
 * y1 = yminNorm / 1000 * alturaImagem
 * x1 = xminNorm / 1000 * larguraImagem
 * y2 = ymaxNorm / 1000 * alturaImagem
 * x2 = xmaxNorm / 1000 * larguraImagem
 *
 * Em %: valorNorm / 10  (equivale a /1000 * 100).
 */
export function parseApiCoordinates(coordinates: string | null | undefined): CropRect | null {
  if (!coordinates?.trim()) return null

  const parts = coordinates.split(',').map((part) => Number.parseFloat(part.trim()))
  if (parts.length !== 4 || parts.some((value) => !Number.isFinite(value))) return null

  const [yminNorm, xminNorm, ymaxNorm, xmaxNorm] = parts

  const left = Math.min(xminNorm, xmaxNorm) / 1000
  const top = Math.min(yminNorm, ymaxNorm) / 1000
  const right = Math.max(xminNorm, xmaxNorm) / 1000
  const bottom = Math.max(yminNorm, ymaxNorm) / 1000

  const width = (right - left) * 100
  const height = (bottom - top) * 100
  if (width <= 0.1 || height <= 0.1) return null

  return {
    x: left * 100,
    y: top * 100,
    width,
    height,
  }
}

/** Prefixos antigos também são limpos no re-seed. */
export const API_CROP_ID_PREFIX = 'crop-api-v3-'

export function apiCropIdForNews(newsId: string): string {
  return `${API_CROP_ID_PREFIX}${newsId}`
}

export function isApiSeededCropId(cropId: string): boolean {
  return cropId.startsWith('crop-api-')
}
