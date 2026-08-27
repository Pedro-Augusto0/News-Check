import { describe, expect, it } from 'vitest'
import type { ReviewQueueItem } from '../model'
import { canAttachNews } from './attach-news'

function item(overrides: Partial<ReviewQueueItem> & Pick<ReviewQueueItem, 'id'>): ReviewQueueItem {
  return {
    kind: 'news',
    editionId: 'ed-1',
    pdfId: 'pdf-1',
    pageNumber: '1',
    newsId: overrides.id.replace('news:', ''),
    cropIds: ['c1'],
    title: overrides.id,
    text: '',
    clientKeywords: [],
    hasClient: false,
    suspectReasons: [],
    sortY: 0,
    previewRect: null,
    ...overrides,
  }
}

describe('canAttachNews', () => {
  it('allows coupling two different news items', () => {
    expect(canAttachNews(item({ id: 'news:a' }), item({ id: 'news:b', pageNumber: '3' }))).toBe(true)
  })

  it('rejects the same item, missing news, or non-news kinds', () => {
    const current = item({ id: 'news:a' })
    expect(canAttachNews(current, current)).toBe(false)
    expect(canAttachNews(current, item({ id: 'orphan:c1', kind: 'orphan-crop', newsId: null }))).toBe(false)
    expect(canAttachNews(null, item({ id: 'news:b' }))).toBe(false)
  })
})
