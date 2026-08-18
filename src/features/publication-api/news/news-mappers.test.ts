import { describe, expect, it } from 'vitest'
import type { VehicleEdition } from '@/features/edition-session/model'
import type { StoredNewsItem } from '@/features/news'
import type { ApiNewsItemDto } from '../dto'
import {
  buildCropSeedsFromApiNews,
  buildPageImageMap,
  buildPagesFromNews,
  mapApiNewsToStoredItems,
} from './news-mappers'

const edition: VehicleEdition = {
  id: 'edition-1',
  vehicleName: 'Gazeta',
  editionDate: '2026-08-18',
  label: 'Gazeta - 2026-08-18',
  clientKeywords: [],
  pdfs: [{ id: 'pdf-1', name: 'Gazeta', url: '', pages: [] }],
}

function apiNews(id: number, overrides: Partial<ApiNewsItemDto> = {}): ApiNewsItemDto {
  return {
    id,
    title: `Title ${id}`,
    text: `Text ${id}`,
    author: '',
    publication: 'Gazeta',
    coordinates: '100,100,500,500',
    section: '',
    filePath: `http://170.80.70.78/pages/${id}.jpg`,
    page: '1',
    searchResults: [],
    ...overrides,
  }
}

describe('news API mappers', () => {
  it('groups by naturally sorted page and resets list order per page', () => {
    const items = mapApiNewsToStoredItems(edition, [
      apiNews(10, { page: 'A10' }),
      apiNews(2, {
        page: 'A2',
        title: ' ',
        text: ' fallback title ',
        searchResults: [
          { channelId: 1, customerId: 1, highlights: [' client ', '', 'client'], searchedIds: [] },
        ],
      }),
      apiNews(3, { page: 'A2', title: '', text: '.' }),
    ])

    expect(items.map((item) => [item.id, item.pageNumber, item.listOrder])).toEqual([
      ['2', 'A2', 0],
      ['3', 'A2', 1],
      ['10', 'A10', 0],
    ])
    expect(items[0]).toMatchObject({
      title: 'fallback title',
      text: 'fallback title',
      clientKeywordsFound: ['client'],
      cropId: null,
      pdfId: 'pdf-1',
      editionId: 'edition-1',
    })
    expect(items[1]).toMatchObject({ title: 'Sem título', text: '' })
  })

  it('returns no stored items when the edition has no PDF', () => {
    expect(mapApiNewsToStoredItems({ ...edition, pdfs: [] }, [apiNews(1)])).toEqual([])
  })

  it('keeps the first usable image per page and proxies scancontrol URLs', () => {
    const map = buildPageImageMap([
      apiNews(1, { page: '2', filePath: null }),
      apiNews(2, { page: '2' }),
      apiNews(3, { page: '2', filePath: 'https://example.com/later.jpg' }),
    ])

    expect([...map.entries()]).toEqual([['2', '/pages/2.jpg']])
  })

  it('creates crop seeds only when coordinates and image are present', () => {
    const seeds = buildCropSeedsFromApiNews([
      apiNews(1),
      apiNews(2, { coordinates: ' ' }),
      apiNews(3, { filePath: null }),
    ])

    expect(seeds).toEqual([
      {
        newsId: '1',
        pageNumber: '1',
        imageUrl: '/pages/1.jpg',
        coordinates: '100,100,500,500',
        title: 'Title 1',
        text: 'Text 1',
        clientKeywordsFound: [],
      },
    ])
  })

  it('builds page summaries and keeps the empty placeholder contract', () => {
    const stored: StoredNewsItem[] = [
      {
        id: '1',
        title: 'One',
        cropId: null,
        pdfId: 'pdf-1',
        pageNumber: 'A2',
        editionId: 'edition-1',
        clientKeywordsFound: ['client', 'shared'],
      },
      {
        id: '2',
        title: 'Two',
        cropId: null,
        pdfId: 'pdf-1',
        pageNumber: 'A2',
        editionId: 'edition-1',
        clientKeywordsFound: ['shared'],
      },
    ]

    expect(buildPagesFromNews(stored, new Map([['A2', '/page.jpg']]))[0]).toMatchObject({
      pageNumber: 'A2',
      imageUrl: '/page.jpg',
      hasClient: true,
      keywordsFound: ['client', 'shared'],
    })
    expect(buildPagesFromNews([])).toEqual([
      expect.objectContaining({ pageNumber: '1', imageUrl: '', hasClient: false }),
    ])
  })
})
