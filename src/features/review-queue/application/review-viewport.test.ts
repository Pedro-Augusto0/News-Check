import { describe, expect, it } from 'vitest'
import {
  REVIEW_DEFAULT_ZOOM,
  REVIEW_FIT_SCALE,
  clampReviewZoom,
  computeReviewPageDisplaySize,
  computeReviewPageScale,
  nextStableViewport,
  stepReviewZoom,
} from './review-viewport'

describe('nextStableViewport', () => {
  it('ignores subpixel jitter', () => {
    const previous = { width: 800, height: 600 }
    expect(nextStableViewport(previous, { width: 800.4, height: 599.6 })).toBe(previous)
  })

  it('accepts a real window resize', () => {
    expect(nextStableViewport({ width: 800, height: 600 }, { width: 1200, height: 800 })).toEqual({
      width: 1200,
      height: 800,
    })
  })
})

describe('computeReviewPageScale', () => {
  const tallScan = {
    naturalWidth: 4000,
    naturalHeight: 12000,
    usableWidth: 900,
    zoom: 1,
  }

  it('uses 75% of the stage width at 100% zoom', () => {
    const scale = computeReviewPageScale(tallScan)
    expect(scale).toBeCloseTo((900 / 4000) * REVIEW_FIT_SCALE, 5)
    expect(4000 * scale).toBeCloseTo(900 * REVIEW_FIT_SCALE, 5)
  })

  it('scales linearly with zoom', () => {
    const at100 = computeReviewPageScale(tallScan)
    const at200 = computeReviewPageScale({ ...tallScan, zoom: 2 })
    expect(at200).toBeCloseTo(at100 * 2, 5)
  })
})

describe('computeReviewPageDisplaySize', () => {
  it('matches the fitted page size used by the stage canvas', () => {
    const { width, height } = computeReviewPageDisplaySize(900, 1)
    const scale = computeReviewPageScale({
      naturalWidth: 595,
      usableWidth: 892,
      zoom: 1,
    })

    expect(width).toBe(Math.round(595 * scale))
    expect(height).toBe(Math.round(842 * scale))
  })

  it('returns zero before the viewport is measured', () => {
    expect(computeReviewPageDisplaySize(0, 1)).toEqual({ width: 0, height: 0 })
  })
})

describe('clampReviewZoom', () => {
  it('keeps zoom inside the toolbar range', () => {
    expect(clampReviewZoom(0.1)).toBe(0.5)
    expect(clampReviewZoom(4)).toBe(2.5)
    expect(stepReviewZoom(1, 1)).toBe(1.1)
  })
})

describe('REVIEW_DEFAULT_ZOOM', () => {
  it('starts at 100%', () => {
    expect(REVIEW_DEFAULT_ZOOM).toBe(1)
  })
})
