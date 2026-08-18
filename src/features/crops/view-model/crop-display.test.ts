import { describe, expect, it } from 'vitest'
import type { Crop, CropGroup } from '@/features/crops'
import {
  ensureDisplayIndices,
  nextDisplayIndex,
  resolveCropDisplayIndex,
  buildCropDisplayIndexMap,
  buildCropDisplayTree,
  buildCropsByPageSections,
  formatCropPagesLabel,
} from './crop-display'

function crop(id: string, pageNumber: string, y: number, overrides: Partial<Crop> = {}): Crop {
  return {
    id,
    editionId: 'edition-1',
    pdfId: 'pdf-1',
    pageNumber,
    rect: { x: 0, y, width: 10, height: 10 },
    title: id,
    text: '',
    groupId: null,
    finalized: false,
    displayIndex: 0,
    ...overrides,
  }
}

describe('crop display index', () => {
  it('assigns missing indices by page and vertical position per PDF', () => {
    const crops = {
      later: crop('later', 'A10', 5),
      lower: crop('lower', 'A2', 80),
      upper: crop('upper', 'A2', 10),
    }

    const indexed = ensureDisplayIndices(crops, 'edition-1')

    expect(indexed.upper.displayIndex).toBe(1)
    expect(indexed.lower.displayIndex).toBe(2)
    expect(indexed.later.displayIndex).toBe(3)
  })

  it('appends after the highest valid index and preserves an already indexed object', () => {
    const crops = {
      one: crop('one', '1', 0, { displayIndex: 7 }),
      otherEdition: crop('otherEdition', '1', 0, {
        editionId: 'edition-2',
        displayIndex: 20,
      }),
    }

    expect(nextDisplayIndex(crops, 'edition-1', 'pdf-1')).toBe(8)
    expect(ensureDisplayIndices(crops, 'edition-1')).toBe(crops)
    expect(resolveCropDisplayIndex(undefined, crops)).toBe(1)
  })
})

describe('crop display tree', () => {
  it('collapses grouped crops under the group root and shares display info', () => {
    const crops = {
      child: crop('child', '2', 5, { groupId: 'group-1' }),
      root: crop('root', '1', 10, { groupId: 'group-1' }),
      single: crop('single', '1', 20),
    }
    const groups: Record<string, CropGroup> = {
      'group-1': {
        id: 'group-1',
        title: 'Grouped',
        cropIds: ['root', 'child'],
        editionId: 'edition-1',
      },
    }

    const tree = buildCropDisplayTree('edition-1', 'pdf-1', crops, groups)
    const index = buildCropDisplayIndexMap('edition-1', 'pdf-1', crops, groups)

    expect(tree.map((node) => node.id)).toEqual(['group-1', 'single'])
    expect(tree[0].children?.map((node) => node.id)).toEqual(['child'])
    expect(index.get('root')).toEqual(index.get('child'))
    expect(index.get('root')?.displayIndex).toBe(1)
    expect(index.get('single')?.displayIndex).toBe(2)
  })

  it('moves crop sections to the linked news page and formats page labels', () => {
    const node = { type: 'crop' as const, id: 'crop-1', crop: crop('crop-1', '1', 0, { newsItemId: 'news-1' }) }
    const sections = buildCropsByPageSections([node], [{ id: 'news-1', pageNumber: 'A2' }])

    expect(sections).toEqual([{ pageNumber: 'A2', nodes: [node] }])
    expect(formatCropPagesLabel(['A10', 'A2', 'A2', 'B1'])).toBe('p. A2, A10 e B1')
  })
})
