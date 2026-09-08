import type { CropRect } from '@/features/crops/geometry'

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
/** Converte retângulo percentual (0–100) para coordenadas normalizadas da API (0–1000). */
export function formatCropRectToApiCoordinates(rect: CropRect): string {
  const ymin = Math.round((rect.y / 100) * 1000)
  const xmin = Math.round((rect.x / 100) * 1000)
  const ymax = Math.round(((rect.y + rect.height) / 100) * 1000)
  const xmax = Math.round(((rect.x + rect.width) / 100) * 1000)
  return `${ymin},${xmin},${ymax},${xmax}`
}

/** Padding visual ao exibir áreas da API na página (%). */
export const CROP_DISPLAY_PADDING_PERCENT = 0.75

/** Expande levemente para esquerda e para baixo, mantendo topo e direita. */
export function expandCropRectForDisplay(
  rect: CropRect,
  paddingPercent = CROP_DISPLAY_PADDING_PERCENT,
): CropRect {
  const pad = Math.max(0, paddingPercent)
  const x = Math.max(0, rect.x - pad)
  const y = rect.y
  const width = Math.min(100 - x, rect.width + (rect.x - x))
  const height = Math.min(100 - y, rect.height + pad)
  if (width <= 0.1 || height <= 0.1) return rect
  const round = (value: number) => Math.round(value * 10000) / 10000
  return { x: round(x), y: round(y), width: round(width), height: round(height) }
}

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

  return expandCropRectForDisplay({
    x: left * 100,
    y: top * 100,
    width,
    height,
  })
}

/** Prefixos antigos também são limpos no re-seed. */
export const API_CROP_ID_PREFIX = 'crop-api-v3-'

export function apiCropIdForNews(newsId: string, index = 0): string {
  return `${API_CROP_ID_PREFIX}${newsId}-${index}`
}

export function isApiSeededCropId(cropId: string): boolean {
  return cropId.startsWith('crop-api-')
}

export function normalizeApiCoordinateList(value: unknown): string[] {
  const list = Array.isArray(value) ? value : value == null || value === '' ? [] : [value]
  const coordinates: string[] = []
  for (const entry of list) {
    if (typeof entry !== 'string') continue
    const trimmed = entry.trim()
    if (trimmed) coordinates.push(trimmed)
  }
  return coordinates
}
