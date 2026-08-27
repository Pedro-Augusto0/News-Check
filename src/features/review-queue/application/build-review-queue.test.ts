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
