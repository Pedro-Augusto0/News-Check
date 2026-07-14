export interface TextLineInfo {
  text: string
  y: number
  fontSize: number
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

export function detectTitleFromLines(
  lines: TextLineInfo[],
): { title: string; bodyText: string } {
  const nonEmpty = lines.filter((line) => line.text.trim())
  if (nonEmpty.length === 0) return { title: '', bodyText: '' }

  const sorted = [...nonEmpty].sort((a, b) => a.y - b.y)
  const maxFont = Math.max(...sorted.map((line) => line.fontSize))
  const medianFont = median(sorted.map((line) => line.fontSize))
  const titleThreshold = Math.max(maxFont * 0.85, medianFont * 1.15)

  const minY = sorted[0].y
  const maxY = sorted[sorted.length - 1].y
  const span = maxY - minY || 1
  const topZone = minY + span * 0.35

  const titleIndices = new Set<number>()

  for (let i = 0; i < sorted.length; i++) {
    if (i >= 4) break

    const line = sorted[i]
    const inTopZone = line.y <= topZone
    const isLarge = line.fontSize >= titleThreshold
    const continuesHeadline =
      titleIndices.size > 0 && line.fontSize >= maxFont * 0.75

    if (isLarge && (inTopZone || titleIndices.size === 0)) {
      titleIndices.add(i)
    } else if (continuesHeadline && inTopZone) {
      titleIndices.add(i)
    } else if (titleIndices.size > 0) {
      break
    }
  }

  if (titleIndices.size === 0) {
    const first = sorted[0]
    if (first.text.length <= 120 && first.fontSize >= medianFont) {
      titleIndices.add(0)
    }
  }

  const title = [...titleIndices]
    .sort((a, b) => a - b)
    .map((index) => sorted[index].text)
    .join(' ')
    .trim()

  const bodyText = sorted
    .filter((_, index) => !titleIndices.has(index))
    .map((line) => line.text)
    .join('\n')
    .trim()

  const fullText = sorted.map((line) => line.text).join('\n').trim()

  return {
    title,
    bodyText: bodyText || fullText,
  }
}

export function isDefaultCropTitle(title: string): boolean {
  return !title.trim() || /^Novo corte \d+$/.test(title.trim())
}
