import { describe, expect, it } from 'vitest'
import {
  API_CROP_ID_PREFIX,
  apiCropIdForNews,
  isApiSeededCropId,
  parseApiCoordinates,
} from './api-coordinates'

describe('apiCoordinates', () => {
  it('maps normalized API coordinates to percentages', () => {
    expect(parseApiCoordinates('100, 200, 600, 800')).toEqual({
      x: 20,
      y: 10,
      width: 60.00000000000001,
      height: 50,
    })
  })

  it('normalizes inverted corners', () => {
    expect(parseApiCoordinates('600,800,100,200')).toEqual({
      x: 20,
      y: 10,
      width: 60.00000000000001,
      height: 50,
    })
  })

  it.each([null, undefined, '', '1,2,3', '1,2,3,nope', '0,0,1,1'])(
    'rejects invalid or too-small coordinates: %s',
    (value) => {
      expect(parseApiCoordinates(value)).toBeNull()
    },
  )

  it('preserves the seeded crop id contract, including legacy ids', () => {
    expect(apiCropIdForNews('42')).toBe(`${API_CROP_ID_PREFIX}42`)
    expect(isApiSeededCropId('crop-api-v2-42')).toBe(true)
    expect(isApiSeededCropId('crop-manual-42')).toBe(false)
  })
})
