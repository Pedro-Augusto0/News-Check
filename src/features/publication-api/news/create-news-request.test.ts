import { describe, expect, it } from 'vitest'
import type { Crop } from '@/features/crops'
import type { VehicleEdition } from '@/features/edition-session/model'
import type { StoredNewsItem } from '@/features/news'
import type { PageData } from '@/features/page-navigation'
import type { ReviewQueueItem } from '@/features/review-queue/model'
import { buildCreateNewsRequest, parseArticleId, resolveArticleIds } from './create-news-request'
import { API_CROP_ID_PREFIX } from '@/features/crops/api-coordinates'

const edition: VehicleEdition = {
  id: '1',
  vehicleName: 'Folha',
  editionDate: '2026-08-18',
  label: 'Folha 18/08/2026',
  clientKeywords: [],
  pdfs: [{ id: 'pdf-1', name: 'pdf', url: '', pages: [] }],
}

const pages: PageData[] = [
  {
    pageNumber: 'A1',
    imageUrl: '/images/a1.jpg',
    filePath: 'http://170.80.70.78/images/a1.jpg',
    hasClient: false,
    keywordsFound: [],
    keywordsMissing: [],
    keywordOccurrences: [],
    crops: [],
  },
  {
    pageNumber: 'A2',
    imageUrl: '/images/a2.jpg',
    filePath: 'http://170.80.70.78/images/a2.jpg',
    hasClient: false,
    keywordsFound: [],
    keywordsMissing: [],
    keywordOccurrences: [],
    crops: [],
  },
]

function crop(id: string, overrides: Partial<Crop> = {}): Crop {
  return {
    id,
    editionId: '1',
    pdfId: 'pdf-1',
    pageNumber: 'A1',
    rect: { x: 20, y: 10, width: 60, height: 50 },
    title: 'Título',
    text: 'Texto',
    groupId: null,
    finalized: false,
    displayIndex: 0,
    ...overrides,
  }
}

function queueItem(overrides: Partial<ReviewQueueItem> = {}): ReviewQueueItem {
  return {
    id: 'news:42',
    kind: 'news',
    editionId: '1',
    pdfId: 'pdf-1',
    pageNumber: 'A1',
    newsId: '42',
    cropIds: ['crop-1'],
    title: 'Notícia principal',
    text: 'Corpo da notícia',
    clientKeywords: [],
    customerNames: [],
    clientMatches: [],
    hasClient: false,
    suspectReasons: [],
    sortY: 10,
    previewRect: { x: 20, y: 10, width: 60, height: 50 },
    ...overrides,
  }
}

describe('parseArticleId', () => {
  it('parses numeric API ids', () => {
    expect(parseArticleId('42')).toBe(42)
  })

  it('rejects manual ids', () => {
    expect(parseArticleId('news-abc')).toBeNull()
  })
})

describe('resolveArticleIds', () => {
  it('uses merged article ids when present', () => {
    const item: StoredNewsItem = {
      id: '42',
      title: 'x',
      cropId: null,
      pdfId: 'pdf-1',
      pageNumber: 'A1',
      editionId: '1',
      articleIds: [42, 99],
    }
    expect(resolveArticleIds(item)).toEqual([42, 99])
  })
})

describe('buildCreateNewsRequest', () => {
  it('maps approved news with clippings to API payload', () => {
    const newsItems: Record<string, StoredNewsItem> = {
      '42': {
        id: '42',
        title: 'Notícia principal',
        text: 'Corpo da notícia',
        cropId: 'crop-1',
        pdfId: 'pdf-1',
        pageNumber: 'A1',
        editionId: '1',
        author: 'Autor',
        section: 'Cidades',
        apiPublication: '2026-08-18T08:00:00',
        articleIds: [42],
      },
    }

    const request = buildCreateNewsRequest({
      item: queueItem(),
      crops: { 'crop-1': crop('crop-1') },
      newsItems,
      edition,
      pages,
    })

    expect(request).toEqual({
      articleIds: [42],
      title: 'Notícia principal',
      publication: '2026-08-18T08:00:00',
      section: 'Cidades',
      page: 'A1',
      text: 'Corpo da notícia',
      author: 'Autor',
      hasPhoto: false,
      clippings: [
        {
          articleId: 42,
          coordinates: '100,200,600,800',
          page: 'A1',
          filePath: 'http://170.80.70.78/images/a1.jpg',
        },
      ],
    })
  })

  it('includes multiple clippings across pages', () => {
    const request = buildCreateNewsRequest({
      item: queueItem({
        cropIds: ['crop-1', 'crop-2'],
        newsId: '42',
      }),
      crops: {
        'crop-1': crop('crop-1', { newsItemId: '42' }),
        'crop-2': crop(`${API_CROP_ID_PREFIX}99`, { pageNumber: 'A2', newsItemId: '42' }),
      },
      newsItems: {
        '42': {
          id: '42',
          title: 'Merged',
          cropId: null,
          pdfId: 'pdf-1',
          pageNumber: 'A1',
          editionId: '1',
          articleIds: [42, 99],
        },
      },
      edition,
      pages,
    })

    expect(request?.clippings).toEqual([
      expect.objectContaining({ articleId: 42, page: 'A1' }),
      expect.objectContaining({ articleId: 99, page: 'A2' }),
    ])
  })

  it('skips empty pages and items without crops', () => {
    expect(
      buildCreateNewsRequest({
        item: queueItem({ kind: 'empty-page', cropIds: [] }),
        crops: {},
        newsItems: {},
        edition,
        pages,
      }),
    ).toBeNull()

    expect(
      buildCreateNewsRequest({
        item: queueItem({ cropIds: [] }),
        crops: {},
        newsItems: {},
        edition,
        pages,
      }),
    ).toBeNull()
  })
})
