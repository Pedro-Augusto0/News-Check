import Tesseract from 'tesseract.js'
import {
  CROP_OCR_TARGET_WIDTH,
  extractTextLinesInRect,
  renderCropRegionToCanvas,
} from '@/lib/pdf/documentCache'
import { sortLinesByColumnReadingOrder } from '@/utils/columnTextOrder'
import { detectTitleFromLines, type TextLineInfo } from '@/utils/detectTitle'
import type { CropRect } from '@/utils/cropGeometry'

export { extractPageText, extractTextInRect, extractTextLinesInRect } from '@/lib/pdf/documentCache'

const MIN_PDF_TEXT_CHARS = 15

interface OcrWordBox {
  text: string
  bbox: { x0: number; y0: number; x1: number; y1: number }
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function wordsToLineInfo(words: OcrWordBox[]): TextLineInfo | null {
  const parts = words.map((word) => word.text.trim()).filter(Boolean)
  if (parts.length === 0) return null

  const x0 = Math.min(...words.map((word) => word.bbox.x0))
  const y0 = Math.min(...words.map((word) => word.bbox.y0))
  const x1 = Math.max(...words.map((word) => word.bbox.x1))
  const y1 = Math.max(...words.map((word) => word.bbox.y1))

  return {
    text: parts.join(' ').trim(),
    x: x0,
    y: y0,
    fontSize: y1 - y0,
    width: x1 - x0,
  }
}

/** Tesseract junta colunas na mesma linha; separa por gaps horizontais entre palavras. */
function splitOcrLineByWordGaps(line: {
  text: string
  bbox: { x0: number; y0: number; x1: number; y1: number }
  words?: OcrWordBox[]
}): TextLineInfo[] {
  const words = line.words?.filter((word) => word.text.trim()) ?? []
  if (words.length <= 1) {
    const text = line.text.trim()
    if (!text) return []
    return [{
      text,
      x: line.bbox.x0,
      y: line.bbox.y0,
      fontSize: line.bbox.y1 - line.bbox.y0,
      width: line.bbox.x1 - line.bbox.x0,
    }]
  }

  const sorted = [...words].sort((a, b) => a.bbox.x0 - b.bbox.x0)
  const gaps = sorted.slice(1).map((word, index) => word.bbox.x0 - sorted[index].bbox.x1)
  const positiveGaps = gaps.filter((gap) => gap > 0)
  const medianWordGap = positiveGaps.length > 0 ? median(positiveGaps) : 8
  const lineHeight = line.bbox.y1 - line.bbox.y0
  const splitThreshold = Math.max(medianWordGap * 2.2, lineHeight * 0.8, 12)

  const segments: OcrWordBox[][] = [[sorted[0]]]
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].bbox.x0 - sorted[i - 1].bbox.x1
    if (gap >= splitThreshold) {
      segments.push([sorted[i]])
    } else {
      segments[segments.length - 1].push(sorted[i])
    }
  }

  return segments
    .map(wordsToLineInfo)
    .filter((segment): segment is TextLineInfo => segment !== null)
}

export interface CropExtractionResult {
  title: string
  text: string
}

let ocrWorker: Tesseract.Worker | null = null
let ocrWorkerPromise: Promise<Tesseract.Worker> | null = null

async function getOcrWorker(): Promise<Tesseract.Worker> {
  if (ocrWorker) return ocrWorker
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = Tesseract.createWorker('por').then(async (worker) => {
      await worker.setParameters({
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
      })
      ocrWorker = worker
      return worker
    })
  }
  return ocrWorkerPromise
}

function linesToText(lines: TextLineInfo[]): string {
  return sortLinesByColumnReadingOrder(lines)
    .map((line) => line.text)
    .join('\n')
    .trim()
}

function resultFromLines(lines: TextLineInfo[]): CropExtractionResult {
  const { title, fullText } = detectTitleFromLines(lines)
  return {
    title,
    text: fullText,
  }
}

async function ocrCropRegion(
  url: string,
  pageNumber: number,
  rect: CropRect,
): Promise<CropExtractionResult> {
  const canvas = document.createElement('canvas')
  await renderCropRegionToCanvas(url, pageNumber, rect, canvas, CROP_OCR_TARGET_WIDTH)
  if (canvas.width <= 0 || canvas.height <= 0) {
    return { title: '', text: '' }
  }

  const worker = await getOcrWorker()
  const { data } = await worker.recognize(canvas, {}, { blocks: true, text: true })

  const lines: TextLineInfo[] = []
  for (const block of data.blocks ?? []) {
    for (const paragraph of block.paragraphs) {
      for (const line of paragraph.lines) {
        const segments = splitOcrLineByWordGaps(line)
        lines.push(...segments)
      }
    }
  }

  if (lines.length > 0) {
    return resultFromLines(sortLinesByColumnReadingOrder(lines))
  }

  return { title: '', text: data.text.trim() }
}

export async function extractCropContent(
  url: string,
  pageNumber: number,
  rect: CropRect,
): Promise<CropExtractionResult> {
  const pdfLines = await extractTextLinesInRect(url, pageNumber, rect)
  const pdfText = linesToText(pdfLines)

  if (pdfText.length >= MIN_PDF_TEXT_CHARS) {
    return resultFromLines(pdfLines)
  }

  try {
    const ocrResult = await ocrCropRegion(url, pageNumber, rect)
    if (ocrResult.text.length > pdfText.length) {
      return ocrResult
    }
    return resultFromLines(pdfLines)
  } catch {
    return resultFromLines(pdfLines)
  }
}

/** @deprecated Use extractCropContent */
export async function extractCropText(
  url: string,
  pageNumber: number,
  rect: CropRect,
): Promise<string> {
  const { text } = await extractCropContent(url, pageNumber, rect)
  return text
}
