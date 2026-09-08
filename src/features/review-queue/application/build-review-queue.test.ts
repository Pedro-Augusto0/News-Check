import { describe, expect, it } from 'vitest'
import type { Crop } from '@/features/crops'
import type { StoredNewsItem } from '@/features/news'
import type { PageData } from '@/features/page-navigation'
import {
  buildReviewQueue,
  collectApprovedCropIds,
  filterActiveReviewItems,
  firstPendingId,
  nextPendingAfterStatus,
  rankQueueForReview,
} from './build-review-queue'

function news(overrides: Partial<StoredNewsItem> & Pick<StoredNewsItem, 'id' | 'pageNumber'>): StoredNewsItem {
  return {
    title: overrides.title ?? overrides.id,
    cropId: overrides.cropId ?? null,
    pdfId: 'pdf-1',
    editionId: 'ed-1',
    ...overrides,
  }
}

function crop(overrides: Partial<Crop> & Pick<Crop, 'id' | 'pageNumber'>): Crop {
  return {
    title: overrides.title ?? overrides.id,
    text: '',
    rect: overrides.rect ?? { x: 10, y: 10, width: 20, height: 20 },
    groupId: null,
    finalized: false,
    displayIndex: 1,
    pdfId: 'pdf-1',
    editionId: 'ed-1',
    ...overrides,
  }
}

const pages: PageData[] = [
  {
    pageNumber: '1',
    imageUrl: '',
    hasClient: false,
    keywordsFound: [],
    keywordsMissing: [],
    keywordOccurrences: [],
    crops: [],
  },
  {
    pageNumber: '2',
    imageUrl: '',
    hasClient: false,
    keywordsFound: [],
    keywordsMissing: [],
    keywordOccurrences: [],
    crops: [],
  },
]

describe('buildReviewQueue', () => {
  it('orders client news before suspects before reading order, and keeps empty pages', () => {
    const items = buildReviewQueue({
      editionId: 'ed-1',
      pdfId: 'pdf-1',
      pages,
      newsItems: {
        n1: news({ id: 'n1', pageNumber: '1', title: 'Normal', cropId: 'c1' }),
        n2: news({
          id: 'n2',
          pageNumber: '1',
          title: 'Cliente',
          cropId: 'c2',
          clientKeywordsFound: ['Acme'],
        }),
      },
      crops: {
        c1: crop({ id: 'c1', pageNumber: '1', newsItemId: 'n1', rect: { x: 10, y: 40, width: 20, height: 20 } }),
        c2: crop({ id: 'c2', pageNumber: '1', newsItemId: 'n2', rect: { x: 10, y: 10, width: 20, height: 20 } }),
      },
      groups: {},
    })

    expect(items.map((item) => item.newsId ?? item.kind)).toEqual(['n2', 'n1', 'empty-page'])
    expect(items[0]?.hasClient).toBe(true)
  })

  it('does not treat a continuation page as empty when the merged news still has a crop there', () => {
    const items = buildReviewQueue({
      editionId: 'ed-1',
      pdfId: 'pdf-1',
      pages,
      newsItems: {
        n1: news({ id: 'n1', pageNumber: '1', title: 'Base', cropId: 'c1' }),
      },
      crops: {
        c1: crop({ id: 'c1', pageNumber: '1', newsItemId: 'n1' }),
        c2: crop({ id: 'c2', pageNumber: '2', newsItemId: 'n1' }),
      },
      groups: {},
    })

    expect(items.map((item) => item.newsId ?? item.kind)).toEqual(['n1'])
    expect(items[0]?.cropIds).toEqual(expect.arrayContaining(['c1', 'c2']))
    expect(items[0]?.cropIds).toHaveLength(2)
  })

  it('keeps the newspaper section on each news item', () => {
    const items = buildReviewQueue({
      editionId: 'ed-1',
      pdfId: 'pdf-1',
      pages,
      newsItems: {
        n1: news({ id: 'n1', pageNumber: '1', title: 'Normal', cropId: 'c1', section: 'Cidades' }),
      },
      crops: {
        c1: crop({ id: 'c1', pageNumber: '1', newsItemId: 'n1' }),
      },
      groups: {},
    })

    expect(items.find((item) => item.newsId === 'n1')?.section).toBe('Cidades')
  })

  it('copies relatedPage from the stored news item', () => {
    const items = buildReviewQueue({
      editionId: 'ed-1',
      pdfId: 'pdf-1',
      pages,
      newsItems: {
        n1: news({ id: 'n1', pageNumber: '1', title: 'Normal', cropId: 'c1', relatedPage: 'A3' }),
      },
      crops: {
        c1: crop({ id: 'c1', pageNumber: '1', newsItemId: 'n1' }),
      },
      groups: {},
    })

    expect(items.find((item) => item.newsId === 'n1')?.relatedPage).toBe('A3')
  })

  it('copies customer names from the stored news item', () => {
    const items = buildReviewQueue({
      editionId: 'ed-1',
      pdfId: 'pdf-1',
      pages,
      newsItems: {
        n1: news({
          id: 'n1',
          pageNumber: '1',
          cropId: 'c1',
          customerNames: ['Acme Ltda', 'Banco X'],
        }),
      },
      crops: {
        c1: crop({ id: 'c1', pageNumber: '1', newsItemId: 'n1' }),
      },
      groups: {},
    })

    expect(items.find((item) => item.newsId === 'n1')?.customerNames).toEqual(['Acme Ltda', 'Banco X'])
    expect(items.find((item) => item.newsId === 'n1')?.hasClient).toBe(true)
  })

  it('copies client matches from the stored news item', () => {
    const matches = [
      { customerName: 'Acme Ltda', channelName: 'Impresso', keywords: ['obra'] },
    ]
    const items = buildReviewQueue({
      editionId: 'ed-1',
      pdfId: 'pdf-1',
      pages,
      newsItems: {
        n1: news({
          id: 'n1',
          pageNumber: '1',
          cropId: 'c1',
          clientMatches: matches,
        }),
      },
      crops: {
        c1: crop({ id: 'c1', pageNumber: '1', newsItemId: 'n1' }),
      },
      groups: {},
    })

    expect(items.find((item) => item.newsId === 'n1')?.clientMatches).toEqual(matches)
    expect(items.find((item) => item.newsId === 'n1')?.hasClient).toBe(true)
  })

  it('unions unique client keywords from the news and its crops', () => {
    const items = buildReviewQueue({
      editionId: 'ed-1',
      pdfId: 'pdf-1',
      pages,
      newsItems: {
        n1: news({
          id: 'n1',
          pageNumber: '1',
          cropId: 'c1',
          clientKeywordsFound: ['Acme', 'Beta'],
        }),
      },
      crops: {
        c1: crop({
          id: 'c1',
          pageNumber: '1',
          newsItemId: 'n1',
          clientKeywordsFound: ['Beta', 'Gama'],
        }),
      },
      groups: {},
    })

    expect(items[0]?.clientKeywords).toEqual(['Acme', 'Beta', 'Gama'])
  })

  it('resumes at the first pending item', () => {
    const queue = [
      { id: 'a', hasClient: false },
      { id: 'b', hasClient: false },
      { id: 'c', hasClient: false },
    ] as ReturnType<typeof buildReviewQueue>

    expect(firstPendingId(queue, { a: 'approved' })).toBe('b')
    expect(firstPendingId(queue, { a: 'approved', b: 'approved', c: 'approved' })).toBeNull()
    expect(rankQueueForReview(queue, { a: 'approved' }, false).map((item) => item.id)).toEqual([
      'b',
      'c',
      'a',
    ])
  })

  it('skips reviewed items when advancing after approval', () => {
    const queue = [
      { id: 'a', hasClient: false },
      { id: 'b', hasClient: false },
      { id: 'c', hasClient: false },
    ] as ReturnType<typeof buildReviewQueue>

    expect(
      nextPendingAfterStatus(
        queue,
        { a: 'approved', b: 'approved', c: 'approved' },
        'c',
      ),
    ).toBeNull()
    expect(nextPendingAfterStatus(queue, { b: 'approved' }, 'a')).toBe('c')
  })

  it('removes reviewed items from the active list and collects approved crop ids', () => {
    const queue = [
      { id: 'a', hasClient: false, cropIds: ['c1', 'c2'] },
      { id: 'b', hasClient: true, cropIds: ['c3'] },
      { id: 'c', hasClient: false, cropIds: ['c4'] },
    ] as ReturnType<typeof buildReviewQueue>

    const statuses = { a: 'approved' as const, b: 'rejected' as const }

    expect(filterActiveReviewItems(queue, statuses, false).map((item) => item.id)).toEqual(['c'])
    expect(filterActiveReviewItems(queue, statuses, true).map((item) => item.id)).toEqual([])
    expect([...collectApprovedCropIds(queue, statuses)]).toEqual(['c1', 'c2'])
  })
})
