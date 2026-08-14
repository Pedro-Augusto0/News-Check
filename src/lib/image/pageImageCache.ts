import type { CropRect } from '@/utils/cropGeometry'
import { percentToPx } from '@/utils/cropGeometry'

const imageCache = new Map<string, Promise<HTMLImageElement>>()

export function loadPageImage(url: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(url)
  if (cached) return cached

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Falha ao carregar imagem: ${url}`))
    image.src = url
  })

  imageCache.set(url, promise)
  promise.catch(() => {
    imageCache.delete(url)
  })
  return promise
}

export async function renderImageToCanvas(
  url: string,
  canvas: HTMLCanvasElement,
  scale: number,
): Promise<{ width: number; height: number }> {
  const image = await loadPageImage(url)
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas context unavailable')

  canvas.width = width
  canvas.height = height
  context.drawImage(image, 0, 0, width, height)
  return { width, height }
}

const CROP_PREVIEW_TARGET_WIDTH = 240
export const CROP_OCR_TARGET_WIDTH = 1200

export async function renderImageRegionToCanvas(
  url: string,
  rect: CropRect,
  canvas: HTMLCanvasElement,
  targetWidth = CROP_PREVIEW_TARGET_WIDTH,
): Promise<{ width: number; height: number }> {
  const image = await loadPageImage(url)
  const pxRect = percentToPx(rect, image.naturalWidth, image.naturalHeight)

  if (pxRect.width <= 0 || pxRect.height <= 0) {
    return { width: 0, height: 0 }
  }

  const scale = targetWidth / pxRect.width
  const width = Math.max(1, Math.round(pxRect.width * scale))
  const height = Math.max(1, Math.round(pxRect.height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas context unavailable')

  canvas.width = width
  canvas.height = height
  context.drawImage(
    image,
    pxRect.x,
    pxRect.y,
    pxRect.width,
    pxRect.height,
    0,
    0,
    width,
    height,
  )
  return { width, height }
}
