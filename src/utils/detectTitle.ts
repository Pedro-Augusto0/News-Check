import {
  sortLinesByColumnReadingOrder,
  type PositionedTextLine,
} from '@/utils/columnTextOrder'

export interface TextLineInfo extends PositionedTextLine {}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function sortByVerticalPosition(lines: TextLineInfo[]): TextLineInfo[] {
  return [...lines].sort((a, b) => {
    const yDiff = a.y - b.y
    if (Math.abs(yDiff) > 2) return yDiff
    return a.x - b.x
  })
}

function lineKey(line: TextLineInfo): string {
  return `${line.x}:${line.y}:${line.text}`
}

export function detectTitleFromLines(
  lines: TextLineInfo[],
): { title: string; bodyText: string; fullText: string } {
  const nonEmpty = lines.filter((line) => line.text.trim())
  if (nonEmpty.length === 0) return { title: '', bodyText: '', fullText: '' }

  const forTitle = sortByVerticalPosition(nonEmpty)
  const columnOrdered = sortLinesByColumnReadingOrder(nonEmpty)
  const fullText = columnOrdered.map((line) => line.text).join('\n').trim()

  const maxFont = Math.max(...forTitle.map((line) => line.fontSize))
  const medianFont = median(forTitle.map((line) => line.fontSize))

  // Trecho de corpo com fonte uniforme — não separar título do texto
  if (maxFont / (medianFont || maxFont) < 1.15) {
    return { title: '', bodyText: fullText, fullText }
  }

  const titleThreshold = Math.max(maxFont * 0.85, medianFont * 1.15)

  const minY = forTitle[0].y
  const maxY = forTitle[forTitle.length - 1].y
  const span = maxY - minY || 1
  const topZone = minY + span * 0.35

  const titleLines = new Set<string>()

  for (let i = 0; i < forTitle.length; i++) {
    if (i >= 4) break

    const line = forTitle[i]
    const inTopZone = line.y <= topZone
    const isLarge = line.fontSize >= titleThreshold
    const continuesHeadline =
      titleLines.size > 0 && line.fontSize >= maxFont * 0.75

    if (isLarge && (inTopZone || titleLines.size === 0)) {
      titleLines.add(lineKey(line))
    } else if (continuesHeadline && inTopZone) {
      titleLines.add(lineKey(line))
    } else if (titleLines.size > 0) {
      break
    }
  }

  if (titleLines.size === 0) {
    const first = forTitle[0]
    if (
      first.text.length <= 120 &&
      first.fontSize >= medianFont * 1.25
    ) {
      titleLines.add(lineKey(first))
    }
  }

  const title = forTitle
    .filter((line) => titleLines.has(lineKey(line)))
    .map((line) => line.text)
    .join(' ')
    .trim()

  const bodyText = columnOrdered
    .filter((line) => !titleLines.has(lineKey(line)))
    .map((line) => line.text)
    .join('\n')
    .trim()

  return {
    title,
    bodyText: bodyText || fullText,
    fullText,
  }
}

export function isDefaultCropTitle(title: string): boolean {
  return !title.trim() || /^Novo corte \d+$/.test(title.trim())
}
