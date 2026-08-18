export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

export interface Point {
  x: number
  y: number
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function percentToPx(rect: CropRect, width: number, height: number): CropRect {
  return {
    x: (rect.x / 100) * width,
    y: (rect.y / 100) * height,
    width: (rect.width / 100) * width,
    height: (rect.height / 100) * height,
  }
}

export function pxToPercent(rect: CropRect, width: number, height: number): CropRect {
  if (width <= 0 || height <= 0) return rect
  return {
    x: (rect.x / width) * 100,
    y: (rect.y / height) * 100,
    width: (rect.width / width) * 100,
    height: (rect.height / height) * 100,
  }
}

export function normalizeDrawRect(start: Point, end: Point, containerW: number, containerH: number): CropRect {
  const x1 = clamp(Math.min(start.x, end.x), 0, containerW)
  const y1 = clamp(Math.min(start.y, end.y), 0, containerH)
  const x2 = clamp(Math.max(start.x, end.x), 0, containerW)
  const y2 = clamp(Math.max(start.y, end.y), 0, containerH)
  const w = x2 - x1
  const h = y2 - y1
  return pxToPercent({ x: x1, y: y1, width: w, height: h }, containerW, containerH)
}

export function hitTestCrop(px: number, py: number, rect: CropRect, width: number, height: number): boolean {
  const r = percentToPx(rect, width, height)
  return px >= r.x && px <= r.x + r.width && py >= r.y && py <= r.y + r.height
}

export const MIN_CROP_SIZE_PERCENT = 1

export type CropResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

export function moveRect(
  rect: CropRect,
  deltaX: number,
  deltaY: number,
  containerW: number,
  containerH: number,
): CropRect {
  const px = percentToPx(rect, containerW, containerH)
  const x = clamp(px.x + deltaX, 0, containerW - px.width)
  const y = clamp(px.y + deltaY, 0, containerH - px.height)
  return pxToPercent({ ...px, x, y }, containerW, containerH)
}

export function resizeRect(
  rect: CropRect,
  handle: CropResizeHandle,
  deltaX: number,
  deltaY: number,
  containerW: number,
  containerH: number,
): CropRect {
  const px = percentToPx(rect, containerW, containerH)
  let { x, y, width, height } = px

  if (handle.includes('w')) {
    const right = x + width
    x = clamp(x + deltaX, 0, right - 1)
    width = right - x
  }
  if (handle.includes('e')) {
    width = clamp(width + deltaX, 1, containerW - x)
  }
  if (handle.includes('n')) {
    const bottom = y + height
    y = clamp(y + deltaY, 0, bottom - 1)
    height = bottom - y
  }
  if (handle.includes('s')) {
    height = clamp(height + deltaY, 1, containerH - y)
  }

  return pxToPercent({ x, y, width, height }, containerW, containerH)
}

export function isRectValid(rect: CropRect): boolean {
  return rect.width >= MIN_CROP_SIZE_PERCENT && rect.height >= MIN_CROP_SIZE_PERCENT
}
