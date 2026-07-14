import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { CropRect } from '@/utils/cropGeometry'
import { percentToPx } from '@/utils/cropGeometry'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

const documentCache = new Map<string, Promise<PDFDocumentProxy>>()

export function loadPdfDocument(url: string): Promise<PDFDocumentProxy> {
  const cached = documentCache.get(url)
  if (cached) return cached

  const promise = pdfjsLib.getDocument(url).promise
  documentCache.set(url, promise)
  return promise
}

export async function renderPageToCanvas(
  url: string,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number,
): Promise<{ width: number; height: number }> {
  const pdf = await loadPdfDocument(url)
  const page = await pdf.getPage(pageNumber)
  const viewport = page.getViewport({ scale })
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas context unavailable')

  canvas.width = viewport.width
  canvas.height = viewport.height

  await page.render({ canvasContext: context, viewport, canvas }).promise
  return { width: viewport.width, height: viewport.height }
}

const CROP_PREVIEW_TARGET_WIDTH = 240
export const CROP_OCR_TARGET_WIDTH = 1200

export async function renderCropRegionToCanvas(
  url: string,
  pageNumber: number,
  rect: CropRect,
  canvas: HTMLCanvasElement,
  targetWidth = CROP_PREVIEW_TARGET_WIDTH,
): Promise<{ width: number; height: number }> {
  const pdf = await loadPdfDocument(url)
  const page = await pdf.getPage(pageNumber)
  const baseViewport = page.getViewport({ scale: 1 })
  const pxRect = percentToPx(rect, baseViewport.width, baseViewport.height)

  if (pxRect.width <= 0 || pxRect.height <= 0) {
    return { width: 0, height: 0 }
  }

  const scale = targetWidth / pxRect.width
  const viewport = page.getViewport({ scale })

  const offscreen = document.createElement('canvas')
  offscreen.width = viewport.width
  offscreen.height = viewport.height
  const offscreenCtx = offscreen.getContext('2d')
  if (!offscreenCtx) throw new Error('Canvas context unavailable')

  await page.render({ canvasContext: offscreenCtx, viewport, canvas: offscreen }).promise

  const sx = pxRect.x * scale
  const sy = pxRect.y * scale
  const sw = pxRect.width * scale
  const sh = pxRect.height * scale

  canvas.width = Math.round(sw)
  canvas.height = Math.round(sh)

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas context unavailable')

  context.drawImage(offscreen, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  return { width: canvas.width, height: canvas.height }
}

export async function extractPageText(url: string, pageNumber: number): Promise<string> {
  const pdf = await loadPdfDocument(url)
  const page = await pdf.getPage(pageNumber)
  const content = await page.getTextContent()
  return content.items
    .map((item) => ('str' in item ? item.str : ''))
    .join(' ')
}

export async function extractTextInRect(
  url: string,
  pageNumber: number,
  rect: CropRect,
): Promise<string> {
  const lines = await extractTextLinesInRect(url, pageNumber, rect)
  return lines.map((line) => line.text).join(' ').trim()
}

export interface PdfTextLine {
  text: string
  y: number
  fontSize: number
}

export async function extractTextLinesInRect(
  url: string,
  pageNumber: number,
  rect: CropRect,
): Promise<PdfTextLine[]> {
  const pdf = await loadPdfDocument(url)
  const page = await pdf.getPage(pageNumber)
  const content = await page.getTextContent()
  const viewport = page.getViewport({ scale: 1 })
  const pxRect = percentToPx(rect, viewport.width, viewport.height)

  const items: { str: string; x: number; y: number; fontSize: number }[] = []
  for (const item of content.items) {
    if (!('str' in item) || !item.str.trim()) continue
    const tx = pdfjsLib.Util.transform(viewport.transform, item.transform)
    const x = tx[4]
    const y = tx[5]
    const fontSize = Math.hypot(tx[2], tx[3])
    const topY = y - fontSize
    if (
      x >= pxRect.x &&
      x <= pxRect.x + pxRect.width &&
      topY >= pxRect.y &&
      y <= pxRect.y + pxRect.height
    ) {
      items.push({ str: item.str, x, y, fontSize })
    }
  }

  items.sort((a, b) => {
    const yDiff = a.y - b.y
    if (Math.abs(yDiff) > 2) return yDiff
    return a.x - b.x
  })

  const lines: PdfTextLine[] = []
  for (const item of items) {
    const topY = item.y - item.fontSize
    const last = lines[lines.length - 1]
    if (last && Math.abs(last.y - topY) <= item.fontSize * 0.6) {
      last.text += (last.text.endsWith('-') ? '' : ' ') + item.str
      last.fontSize = Math.max(last.fontSize, item.fontSize)
    } else {
      lines.push({ text: item.str, y: topY, fontSize: item.fontSize })
    }
  }

  return lines
}
