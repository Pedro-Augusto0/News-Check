import { describe, expect, it } from 'vitest'
import type { Crop, CropGroup } from '@/features/crops'
import type { StoredNewsItem } from '@/features/news'
import {
  buildNewsPageSections,
  excludeFinalizedNewsSections,
  isNewsItemPending,
  sortNewsForPage,
} from './news-crops-view-model'

function news(id: string, overrides: Partial<StoredNewsItem> = {}): StoredNewsItem {
  return {
    id,
    title: id,
    cropId: null,
    pdfId: 'pdf-1',
    pageNumber: '1',
    editionId: 'edition-1',
    ...overrides,
  }
}

function crop(id: string, overrides: Partial<Crop> = {}): Crop {
  return {
    id,
    title: id,
    text: '',
    rect: { x: 0, y: 10, width: 10, height: 10 },
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

describe('pending news', () => {
  it('sorts by list order, with ids breaking ties and missing order last', () => {
    const items = [
      news('z'),
      news('b', { listOrder: 1 }),
      news('a', { listOrder: 1 }),
      news('first', { listOrder: 0 }),
    ]

    expect(sortNewsForPage(items).map((item) => item.id)).toEqual(['first', 'a', 'b', 'z'])
  })

  it('is pending only when no crop in the PDF links to the news', () => {
    const item = news('news-1', { cropId: 'crop-1' })
    const wrongPdf = crop('crop-1', { pdfId: 'pdf-2' })

    expect(isNewsItemPending(item, { 'crop-1': wrongPdf }, 'pdf-1')).toBe(true)
    expect(isNewsItemPending(item, { 'crop-1': crop('crop-1') }, 'pdf-1')).toBe(false)
    expect(
      isNewsItemPending(news('news-1'), { linked: crop('linked', { newsItemId: 'news-1' }) }, 'pdf-1'),
    ).toBe(false)
  })

  it('builds naturally ordered sections with crop entries before pending news', () => {
    const linkedCrop = crop('crop-1', { newsItemId: 'linked', rect: { x: 0, y: 20, width: 10, height: 10 } })
    const node = { type: 'crop' as const, id: linkedCrop.id, crop: linkedCrop }
    const sections = buildNewsPageSections(
      [{ pageNumber: '1', nodes: [node] }],
      [news('pending', { listOrder: 0 }), news('linked', { cropId: 'crop-1', listOrder: 1 })],
      'pdf-1',
      { 'crop-1': linkedCrop },
    )

    expect(sections).toHaveLength(1)
    expect(sections[0].entries.map((entry) => entry.kind)).toEqual(['crop', 'pending'])
  })

  it('hides fully finalized entries, unless their news remains in focus', () => {
    const finalized = crop('crop-1', { finalized: true, newsItemId: 'news-1' })
    const node = { type: 'crop' as const, id: finalized.id, crop: finalized }
    const sections = [
      {
        pageNumber: '1',
        entries: [{ kind: 'crop' as const, node, newsId: 'news-1' }],
      },
    ]
    const groups: Record<string, CropGroup> = {}

    expect(excludeFinalizedNewsSections(sections, { 'crop-1': finalized }, groups)).toEqual([])
    expect(
      excludeFinalizedNewsSections(sections, { 'crop-1': finalized }, groups, {
        keepNewsIds: ['news-1'],
      }),
    ).toEqual(sections)
  })
})
