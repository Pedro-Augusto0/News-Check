import Tesseract from 'tesseract.js'
import {
  CROP_OCR_TARGET_WIDTH,
  extractTextLinesInRect,
  renderCropRegionToCanvas,
} from '@/lib/pdf/documentCache'
import { detectTitleFromLines, type TextLineInfo } from '@/utils/detectTitle'
import type { CropRect } from '@/utils/cropGeometry'

export { extractPageText, extractTextInRect, extractTextLinesInRect } from '@/lib/pdf/documentCache'

const MIN_PDF_TEXT_CHARS = 15

export interface CropExtractionResult {
  title: string
  text: string
}

let ocrWorker: Tesseract.Worker | null = null
let ocrWorkerPromise: Promise<Tesseract.Worker> | null = null

async function getOcrWorker(): Promise<Tesseract.Worker> {
  if (ocrWorker) return ocrWorker
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = Tesseract.createWorker('por').then((worker) => {
      ocrWorker = worker
      return worker
    })
  }
  return ocrWorkerPromise
}

function linesToText(lines: TextLineInfo[]): string {
  return lines
    .map((line) => line.text)
    .join('\n')
    .trim()
}

function resultFromLines(lines: TextLineInfo[]): CropExtractionResult {
  const { title, bodyText } = detectTitleFromLines(lines)
  return {
    title,
    text: bodyText,
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
        const text = line.text.trim()
        if (!text) continue
        lines.push({
          text,
          y: line.bbox.y0,
          fontSize: line.bbox.y1 - line.bbox.y0,
        })
      }
    }
  }

  if (lines.length > 0) {
    return resultFromLines(lines)
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
