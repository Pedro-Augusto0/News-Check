export interface PositionedTextLine {
  text: string
  x: number
  y: number
  fontSize: number
  width?: number
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function lineRight(line: PositionedTextLine): number {
  return line.x + (line.width ?? line.fontSize * 4)
}

function clusterLeftEdges(leftEdges: number[], tolerance: number): number[] {
  if (leftEdges.length === 0) return []

  const clusters: number[] = []
  let sum = leftEdges[0]
  let count = 1

  for (let i = 1; i < leftEdges.length; i++) {
    if (leftEdges[i] - leftEdges[i - 1] <= tolerance) {
      sum += leftEdges[i]
      count++
    } else {
      clusters.push(sum / count)
      sum = leftEdges[i]
      count = 1
    }
  }
  clusters.push(sum / count)
  return clusters
}

function findColumnBoundaries(lines: PositionedTextLine[]): number[] {
  if (lines.length < 2) return []

  const minX = Math.min(...lines.map((line) => line.x))
  const maxX = Math.max(...lines.map((line) => lineRight(line)))
  const span = maxX - minX
  if (span < 20) return []

  const lineWidths = lines.map((l) => lineRight(l) - l.x).filter((w) => w > 0)
  const typicalWidth = median(lineWidths) || span / 2
  const leftEdges = lines.map((line) => line.x).sort((a, b) => a - b)

  const clusterTolerance = Math.max(
    Math.min(typicalWidth * 0.4, span * 0.15),
    8,
  )
  const clusters = clusterLeftEdges(leftEdges, clusterTolerance)
  const minClusterGap = Math.max(typicalWidth * 0.2, span * 0.03, 8)

  const boundaries: number[] = []
  for (let i = 1; i < clusters.length; i++) {
    const gap = clusters[i] - clusters[i - 1]
    if (gap >= minClusterGap) {
      boundaries.push((clusters[i] + clusters[i - 1]) / 2)
    }
  }

  if (boundaries.length > 0) return boundaries

  // Fallback: maior gap entre bordas esquerdas consecutivas (ex.: 2 colunas com poucas linhas)
  let maxGap = 0
  let maxGapIndex = -1
  for (let i = 1; i < leftEdges.length; i++) {
    const gap = leftEdges[i] - leftEdges[i - 1]
    if (gap > maxGap) {
      maxGap = gap
      maxGapIndex = i
    }
  }

  const minGap = Math.max(typicalWidth * 0.25, span * 0.04, 8)
  if (maxGapIndex > 0 && maxGap >= minGap) {
    return [
      (leftEdges[maxGapIndex] + leftEdges[maxGapIndex - 1]) / 2,
    ]
  }

  return []
}

function columnIndex(x: number, boundaries: number[]): number {
  let col = 0
  for (const boundary of boundaries) {
    if (x > boundary) col++
    else break
  }
  return col
}

/** Detecta divisórias verticais entre colunas a partir de posições x. */
export function detectColumnBoundaries(lines: PositionedTextLine[]): number[] {
  return findColumnBoundaries(lines)
}

export function getColumnIndex(x: number, boundaries: number[]): number {
  return columnIndex(x, boundaries)
}

function sortWithinColumn<T extends PositionedTextLine>(lines: T[]): T[] {
  return [...lines].sort((a, b) => {
    const yDiff = a.y - b.y
    if (Math.abs(yDiff) > 2) return yDiff
    return a.x - b.x
  })
}

export function sortLinesByColumnReadingOrder<T extends PositionedTextLine>(
  lines: T[],
): T[] {
  if (lines.length <= 1) return [...lines]

  const hasPositions = lines.every((line) => Number.isFinite(line.x))
  if (!hasPositions) {
    return [...lines].sort((a, b) => a.y - b.y)
  }

  const boundaries = findColumnBoundaries(lines)
  if (boundaries.length === 0) {
    return sortWithinColumn(lines)
  }

  const columns = new Map<number, T[]>()
  for (const line of lines) {
    const col = columnIndex(line.x, boundaries)
    const bucket = columns.get(col) ?? []
    bucket.push(line)
    columns.set(col, bucket)
  }

  const result: T[] = []
  for (const col of [...columns.keys()].sort((a, b) => a - b)) {
    result.push(...sortWithinColumn(columns.get(col)!))
  }

  return result
}

export function isSameTextLine(
  last: PositionedTextLine,
  next: PositionedTextLine,
  columnBoundaries: number[] = [],
): boolean {
  const lastTop = last.y
  const nextTop = next.y
  const lineHeight = Math.max(last.fontSize, next.fontSize)
  if (Math.abs(lastTop - nextTop) > lineHeight * 0.6) return false

  if (columnBoundaries.length > 0) {
    if (
      columnIndex(next.x, columnBoundaries) !==
      columnIndex(last.x, columnBoundaries)
    ) {
      return false
    }
  }

  const lastRight = lineRight(last)
  const gap = next.x - lastRight
  const maxWordGap = lineHeight * 0.65
  return gap <= maxWordGap && gap >= -lineHeight * 0.25
}
