import { describe, expect, it } from 'vitest'
import type { Crop } from '../model'
import { canMergeCrops } from './can-merge-crops'

function crop(id: string, overrides: Partial<Crop> = {}): Crop {
  return {
    id,
    title: id,
    text: '',
    rect: { x: 0, y: 0, width: 10, height: 10 },
    groupId: null,
    finalized: false,
    displayIndex: 1,
    pdfId: 'pdf-1',
    pageNumber: '1',
    editionId: 'edition-1',
    newsItemId: null,
    ...overrides,
  }
}

describe('canMergeCrops', () => {
  it('rejects missing, identical, grouped or finalized crops', () => {
    const source = crop('a')
    const target = crop('b')

    expect(canMergeCrops(undefined, target, () => false)).toBe(false)
    expect(canMergeCrops(source, source, () => false)).toBe(false)
    expect(canMergeCrops(crop('a', { groupId: 'g' }), crop('b', { groupId: 'g' }), () => false)).toBe(false)
    expect(canMergeCrops(source, target, (id) => id === 'b')).toBe(false)
    expect(canMergeCrops(source, target, () => false)).toBe(true)
  })
})
