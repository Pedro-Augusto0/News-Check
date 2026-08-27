import { describe, expect, it } from 'vitest'
import { cropAreaPercent, cropOverlapRatio, detectCropSuspects } from './suspect-heuristics'
import type { Crop } from '@/features/crops'

function crop(id: string, rect: Crop['rect']): Crop {
  return {
    id,
    title: id,
    text: '',
    rect,
    groupId: null,
    finalized: false,
    displayIndex: 1,
    pdfId: 'pdf-1',
    pageNumber: '1',
    editionId: 'edition-1',
  }
}

describe('detectCropSuspects', () => {
  it('flags a tiny crop', () => {
    const tiny = crop('a', { x: 10, y: 10, width: 4, height: 4 })
    expect(cropAreaPercent(tiny.rect)).toBeLessThan(2)
    expect(detectCropSuspects(tiny, [tiny])).toContain('too-small')
  })

  it('flags a crop covering most of the page', () => {
    const huge = crop('a', { x: 2, y: 2, width: 90, height: 90 })
    expect(detectCropSuspects(huge, [huge])).toContain('too-large')
  })

  it('flags overlapping crops', () => {
    const a = crop('a', { x: 10, y: 10, width: 20, height: 20 })
    const b = crop('b', { x: 12, y: 12, width: 20, height: 20 })
    expect(cropOverlapRatio(a.rect, b.rect)).toBeGreaterThan(0.35)
    expect(detectCropSuspects(a, [a, b])).toContain('overlap')
  })
})
