import { describe, expect, it } from 'vitest'
import type { ReviewQueueItem } from '../model'
import { filterReviewQueueByTitle } from './filter-review-queue-by-title'

function item(id: string, title: string): ReviewQueueItem {
  return {
    id,
    kind: 'news',
    editionId: 'e1',
    pdfId: 'p1',
    pageNumber: '1',
    newsId: id,
    cropIds: [],
    title,
    text: '',
    clientKeywords: [],
    customerNames: [],
    clientMatches: [],
    hasClient: false,
    suspectReasons: [],
    sortY: 0,
    previewRect: null,
  }
}

describe('filterReviewQueueByTitle', () => {
  const items = [
    item('a', 'Prefeitura anuncia obra'),
    item('b', 'São Paulo vence clássico'),
    item('c', 'Economia em alta'),
  ]

  it('returns all items when the query is empty', () => {
    expect(filterReviewQueueByTitle(items, '  ')).toEqual(items)
  })

  it('filters by title without regard to case or accents', () => {
    expect(filterReviewQueueByTitle(items, 'sao paulo').map((entry) => entry.id)).toEqual(['b'])
    expect(filterReviewQueueByTitle(items, 'PREFEITURA').map((entry) => entry.id)).toEqual(['a'])
  })

  it('returns an empty list when nothing matches', () => {
    expect(filterReviewQueueByTitle(items, 'futebol internacional')).toEqual([])
  })

  it('does not match against the news body', () => {
    const withBody = {
      ...item('d', 'Outro assunto'),
      text: 'Prefeitura anuncia obra no centro',
    }
    expect(filterReviewQueueByTitle([...items, withBody], 'prefeitura').map((entry) => entry.id)).toEqual(
      ['a'],
    )
  })
})
