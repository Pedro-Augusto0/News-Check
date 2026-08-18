import { describe, expect, it } from 'vitest'
import {
  clamp,
  hitTestCrop,
  isRectValid,
  moveRect,
  normalizeDrawRect,
  percentToPx,
  pxToPercent,
  resizeRect,
} from './crop-geometry'

describe('cropGeometry', () => {
  it('converts rectangles between percent and pixels', () => {
    const percent = { x: 10, y: 20, width: 30, height: 40 }
    const pixels = percentToPx(percent, 200, 100)

    expect(pixels).toEqual({ x: 20, y: 20, width: 60, height: 40 })
    expect(pxToPercent(pixels, 200, 100)).toEqual(percent)
  })

  it('keeps the original rectangle when a conversion dimension is invalid', () => {
    const rect = { x: 1, y: 2, width: 3, height: 4 }

    expect(pxToPercent(rect, 0, 100)).toBe(rect)
    expect(pxToPercent(rect, 100, -1)).toBe(rect)
  })

  it('normalizes reverse drawing and clamps it to the container', () => {
    expect(normalizeDrawRect({ x: 120, y: 90 }, { x: -10, y: 10 }, 100, 80)).toEqual({
      x: 0,
      y: 12.5,
      width: 100,
      height: 87.5,
    })
  })

  it('treats crop edges as hits', () => {
    const rect = { x: 10, y: 20, width: 30, height: 40 }

    expect(hitTestCrop(20, 20, rect, 200, 100)).toBe(true)
    expect(hitTestCrop(80, 60, rect, 200, 100)).toBe(true)
    expect(hitTestCrop(81, 60, rect, 200, 100)).toBe(false)
  })

  it('moves and resizes without crossing container bounds', () => {
    const rect = { x: 10, y: 10, width: 30, height: 30 }

    expect(moveRect(rect, 500, -500, 100, 100)).toEqual({
      x: 70,
      y: 0,
      width: 30,
      height: 30,
    })
    expect(resizeRect(rect, 'nw', 50, 50, 100, 100)).toEqual({
      x: 39,
      y: 39,
      width: 1,
      height: 1,
    })
  })

  it('characterizes clamp and the minimum valid crop size', () => {
    expect(clamp(12, 0, 10)).toBe(10)
    expect(clamp(-1, 0, 10)).toBe(0)
    expect(isRectValid({ x: 0, y: 0, width: 1, height: 1 })).toBe(true)
    expect(isRectValid({ x: 0, y: 0, width: 0.99, height: 1 })).toBe(false)
  })
})
