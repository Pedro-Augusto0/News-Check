import { describe, expect, it, vi } from 'vitest'
import type { ReviewQueueItem } from '../model'
import { commitDiscardNews, resolveDiscardArticleIds } from './commit-discard-news'

vi.mock('@/features/publication-api/news/discard-news-api', () => ({
  discardNewsArticles: vi.fn(),
}))

import { discardNewsArticles } from '@/features/publication-api/news/discard-news-api'

const mockedDiscard = vi.mocked(discardNewsArticles)

const item: ReviewQueueItem = {
  id: 'news:42',
  kind: 'news',
  editionId: '1',
  pdfId: 'pdf-1',
  pageNumber: 'A1',
  newsId: '42',
  cropIds: ['crop-1'],
  title: 'Test',
  text: '',
    clientKeywords: [],
    customerNames: [],
    clientMatches: [],
  hasClient: false,
  suspectReasons: [],
  sortY: 0,
  previewRect: null,
}

describe('commitDiscardNews', () => {
  it('resolves article ids from stored news', () => {
    expect(
      resolveDiscardArticleIds(item, {
        '42': {
          id: '42',
          title: 'Test',
          cropId: null,
          pdfId: 'pdf-1',
          pageNumber: 'A1',
          editionId: '1',
          articleIds: [42, 99],
        },
      }),
    ).toEqual([42, 99])
  })

  it('calls discard API with resolved article ids', async () => {
    await commitDiscardNews(item, {
      '42': {
        id: '42',
        title: 'Test',
        cropId: null,
        pdfId: 'pdf-1',
        pageNumber: 'A1',
        editionId: '1',
        articleIds: [42],
      },
    })

    expect(mockedDiscard).toHaveBeenCalledWith([42])
  })
})
