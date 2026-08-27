import { describe, expect, it } from 'vitest'
import type { ReviewQueueItem } from '../model'
import { groupReviewQueueByPage } from './group-review-queue-by-page'

function item(id: string, pageNumber: string): ReviewQueueItem {
  return {
    id,
    kind: 'news',
    editionId: 'e1',
    pdfId: 'p1',
    pageNumber,
    newsId: id,
    cropIds: [],
    title: id,
    text: '',
    clientKeywords: [],
    hasClient: false,
    suspectReasons: [],
    sortY: 0,
    previewRect: null,
  }
}

describe('groupReviewQueueByPage', () => {
  it('groups items by page in natural page order', () => {
    const groups = groupReviewQueueByPage([
      item('b', 'A2'),
      item('a', 'A1'),
      item('c', 'A10'),
      item('d', 'A1'),
    ])

    expect(groups.map((group) => group.pageNumber)).toEqual(['A1', 'A2', 'A10'])
    expect(groups[0]?.items.map((entry) => entry.id)).toEqual(['a', 'd'])
    expect(groups[1]?.items.map((entry) => entry.id)).toEqual(['b'])
  })

  it('returns empty list when there are no items', () => {
    expect(groupReviewQueueByPage([])).toEqual([])
  })
})
