import { describe, expect, it } from 'vitest'
import {
  API_CROP_ID_PREFIX,
  apiCropIdForNews,
  expandCropRectForDisplay,
  formatCropRectToApiCoordinates,
  isApiSeededCropId,
  normalizeApiCoordinateList,
  parseApiCoordinates,
} from './api-coordinates'

describe('apiCoordinates', () => {
  it('maps normalized API coordinates to percentages with display padding', () => {
    expect(parseApiCoordinates('100, 200, 600, 800')).toEqual({
      x: 19.25,
      y: 10,
      width: 60.75,
      height: 50.75,
    })
  })

  it('normalizes inverted corners', () => {
    expect(parseApiCoordinates('600,800,100,200')).toEqual({
      x: 19.25,
      y: 10,
      width: 60.75,
      height: 50.75,
    })
  })

  it.each([null, undefined, '', '1,2,3', '1,2,3,nope', '0,0,1,1'])(
    'rejects invalid or too-small coordinates: %s',
    (value) => {
      expect(parseApiCoordinates(value)).toBeNull()
    },
  )

  it('preserves the seeded crop id contract, including legacy ids', () => {
    expect(apiCropIdForNews('42')).toBe(`${API_CROP_ID_PREFIX}42-0`)
    expect(apiCropIdForNews('42', 1)).toBe(`${API_CROP_ID_PREFIX}42-1`)
    expect(isApiSeededCropId('crop-api-v2-42')).toBe(true)
    expect(isApiSeededCropId('crop-manual-42')).toBe(false)
  })

  it('expands crop rects to the left and downward', () => {
    expect(expandCropRectForDisplay({ x: 20, y: 10, width: 60, height: 50 })).toEqual({
      x: 19.25,
      y: 10,
      width: 60.75,
      height: 50.75,
    })
  })

  it('clamps expanded rects to the page bounds', () => {
    expect(expandCropRectForDisplay({ x: 0.2, y: 99, width: 50, height: 0.8 })).toEqual({
      x: 0,
      y: 99,
      width: 50.2,
      height: 1,
    })
  })

  it('serializes expanded coordinates back to API format', () => {
    const rect = parseApiCoordinates('100, 200, 600, 800')
    expect(rect).not.toBeNull()
    expect(formatCropRectToApiCoordinates(rect!)).toBe('100,193,608,800')
  })

  it('normalizes a coordinate list from the API payload', () => {
    expect(normalizeApiCoordinateList(['100,100,500,500', ' 200,200,600,600 ', '', '   '])).toEqual([
      '100,100,500,500',
      '200,200,600,600',
    ])
    expect(normalizeApiCoordinateList('100,100,500,500')).toEqual(['100,100,500,500'])
    expect(normalizeApiCoordinateList(['', 12, null, '1,2,3,4'])).toEqual(['1,2,3,4'])
    expect(normalizeApiCoordinateList(null)).toEqual([])
    expect(normalizeApiCoordinateList([])).toEqual([])
  })
})
