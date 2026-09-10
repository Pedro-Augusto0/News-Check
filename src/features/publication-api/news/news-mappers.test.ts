import { describe, expect, it } from 'vitest'
import type { VehicleEdition } from '@/features/edition-session/model'
import type { StoredNewsItem } from '@/features/news'
import type { ApiNewsItemDto, NewsSearchResultDto } from '../dto'
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
    coordinates: ['100,100,500,500'],
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
          { channelId: 1, channelName: 'Impresso', customerId: 1, customerName: 'Acme Ltda', highlights: [' client ', '', 'client'], searchedIds: [] },
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
      customerNames: ['Acme Ltda'],
      clientMatches: [
        {
          customerId: 1,
          customerName: 'Acme Ltda',
          channelId: 1,
          channelName: 'Impresso',
          keywords: ['client'],
        },
      ],
      cropId: null,
      pdfId: 'pdf-1',
      editionId: 'edition-1',
    })
    expect(items[1]).toMatchObject({ title: 'Sem título', text: '' })
  })

  it('maps relatedPage from camelCase or PascalCase and ignores blanks', () => {
    expect(mapApiNewsToStoredItems(edition, [apiNews(1, { relatedPage: ' A3 ' })])[0]?.relatedPage).toBe(
      'A3',
    )
    expect(mapApiNewsToStoredItems(edition, [apiNews(1, { relatedPage: '   ' })])[0]?.relatedPage).toBeUndefined()
    expect(mapApiNewsToStoredItems(edition, [apiNews(1, { relatedPage: null })])[0]?.relatedPage).toBeUndefined()
    expect(
      mapApiNewsToStoredItems(edition, [
        { ...apiNews(1), relatedPage: undefined, RelatedPage: 'B4' } as ApiNewsItemDto & {
          RelatedPage: string
        },
      ])[0]?.relatedPage,
    ).toBe('B4')
  })

  it('collects unique customer names from search results', () => {
    const items = mapApiNewsToStoredItems(edition, [
      apiNews(1, {
        searchResults: [
          { channelId: 1, channelName: 'Impresso', customerId: 10, customerName: ' Banco X ', highlights: ['x'], searchedIds: [] },
          { channelId: 2, channelName: 'Digital', customerId: 11, customerName: 'Banco X', highlights: ['y'], searchedIds: [] },
          { channelId: 3, customerId: 12, customerName: '  ', highlights: [], searchedIds: [] },
          { channelId: 4, customerId: 13, customerName: 'Seguradora Y', highlights: [], searchedIds: [] },
        ],
      }),
    ])

    expect(items[0]?.customerNames).toEqual(['Banco X', 'Seguradora Y'])
  })

  it('maps search results into client matches by customer and channel', () => {
    const items = mapApiNewsToStoredItems(edition, [
      apiNews(1, {
        searchResults: [
          { channelId: 1, channelName: 'Impresso', customerId: 10, customerName: ' Banco X ', highlights: [' juros ', 'Juros'], searchedIds: [] },
          { channelId: 1, channelName: 'Impresso', customerId: 10, customerName: 'Banco X', highlights: ['selic'], searchedIds: [] },
          { channelId: 2, channelName: 'Digital', customerId: 10, customerName: 'Banco X', highlights: ['app'], searchedIds: [] },
          { channelId: 3, customerId: 12, customerName: '  ', highlights: [], searchedIds: [] },
        ],
      }),
    ])

    expect(items[0]?.clientMatches).toEqual([
      {
        customerId: 10,
        customerName: 'Banco X',
        channelId: 1,
        channelName: 'Impresso',
        keywords: ['juros', 'selic'],
      },
      {
        customerId: 10,
        customerName: 'Banco X',
        channelId: 2,
        channelName: 'Digital',
        keywords: ['app'],
      },
    ])
  })

  it('marks client matches when OwnChannel is true', () => {
    const items = mapApiNewsToStoredItems(edition, [
      apiNews(1, {
        searchResults: [
          {
            channelId: 1,
            channelName: 'Impresso',
            customerId: 10,
            customerName: 'Banco X',
            highlights: ['juros'],
            searchedIds: [],
            ownChannel: true,
          },
          {
            channelId: 2,
            channelName: 'Digital',
            customerId: 10,
            customerName: 'Banco X',
            highlights: ['app'],
            searchedIds: [],
            ownChannel: false,
          },
        ],
      }),
    ])

    expect(items[0]?.clientMatches).toEqual([
      {
        customerId: 10,
        customerName: 'Banco X',
        channelId: 1,
        channelName: 'Impresso',
        keywords: ['juros'],
        ownChannel: true,
      },
      {
        customerId: 10,
        customerName: 'Banco X',
        channelId: 2,
        channelName: 'Digital',
        keywords: ['app'],
      },
    ])
  })

  it('reads OwnChannel from PascalCase', () => {
    const items = mapApiNewsToStoredItems(edition, [
      {
        ...apiNews(1),
        searchResults: [
          {
            channelId: 1,
            channelName: 'Impresso',
            customerId: 10,
            customerName: 'Banco X',
            highlights: ['juros'],
            searchedIds: [],
            OwnChannel: true,
          } as NewsSearchResultDto & { OwnChannel: boolean },
        ],
      },
    ])

    expect(items[0]?.clientMatches?.[0]?.ownChannel).toBe(true)
  })

  it('flags the stored news when any search result is an own channel', () => {
    const items = mapApiNewsToStoredItems(edition, [
      apiNews(22605, {
        title: 'Vokswagen fecha acordo para cortar 50 mil empregos',
        searchResults: [
          {
            channelId: 9204,
            channelName: 'Carta Capital',
            customerId: 1356,
            customerName: 'Compartilhamento Revistas Semanais',
            highlights: ['industria'],
            searchedIds: [],
            ownChannel: false,
          },
          {
            channelId: 15221,
            channelName: 'Volkswagen',
            customerId: 2140,
            customerName: 'Volkswagen Brasil',
            highlights: ['volkswagen'],
            searchedIds: [],
            ownChannel: true,
          },
        ],
      }),
    ])

    expect(items[0]?.hasOwnChannel).toBe(true)
    expect(items[0]?.clientMatches?.some((match) => match.ownChannel)).toBe(true)
  })

  it('keeps keywords on each customer even when ids are missing or shared', () => {
    const items = mapApiNewsToStoredItems(edition, [
      apiNews(1, {
        searchResults: [
          { channelId: 0, channelName: 'InterClip', customerId: 0, customerName: 'Compartilhamento InterClip', highlights: ['vereadores'], searchedIds: [] },
          { channelId: 0, customerName: 'SINICESP', customerId: 0, highlights: ['sindicato'], searchedIds: [] },
          { channelId: 0, customerName: 'Veolia Brasil', customerId: 0, keyword: 'energia', highlights: [], searchedIds: [] },
        ],
      }),
    ])

    expect(items[0]?.clientMatches).toEqual([
      {
        customerId: 0,
        customerName: 'Compartilhamento InterClip',
        channelId: 0,
        channelName: 'InterClip',
        keywords: ['vereadores'],
      },
      {
        customerId: 0,
        customerName: 'SINICESP',
        channelId: 0,
        channelName: '',
        keywords: ['sindicato'],
      },
      {
        customerId: 0,
        customerName: 'Veolia Brasil',
        channelId: 0,
        channelName: '',
        keywords: ['energia'],
      },
    ])
  })

  it('maps done flag from API', () => {
    const items = mapApiNewsToStoredItems(edition, [
      apiNews(1, { done: true }),
      apiNews(2, { done: false }),
      apiNews(3),
    ])

    expect(items.find((item) => item.id === '1')?.done).toBe(true)
    expect(items.find((item) => item.id === '2')?.done).toBe(false)
    expect(items.find((item) => item.id === '3')?.done).toBe(false)
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
      apiNews(2, { coordinates: [] }),
      apiNews(3, { filePath: null }),
      apiNews(4, { coordinates: ['100,100,500,500', ' 200,200,600,700 ', ''] }),
    ])

    expect(seeds).toEqual([
      {
        newsId: '1',
        pageNumber: '1',
        imageUrl: '/pages/1.jpg',
        coordinates: '100,100,500,500',
        index: 0,
        title: 'Title 1',
        text: 'Text 1',
        clientKeywordsFound: [],
      },
      {
        newsId: '4',
        pageNumber: '1',
        imageUrl: '/pages/4.jpg',
        coordinates: '100,100,500,500',
        index: 0,
        title: 'Title 4',
        text: 'Text 4',
        clientKeywordsFound: [],
      },
      {
        newsId: '4',
        pageNumber: '1',
        imageUrl: '/pages/4.jpg',
        coordinates: '200,200,600,700',
        index: 1,
        title: 'Title 4',
        text: 'Text 4',
        clientKeywordsFound: [],
      },
    ])
  })

  it('prefers populated clippings over item coordinates', () => {
    const seeds = buildCropSeedsFromApiNews([
      apiNews(1, {
        coordinates: '1,2,3,4',
        page: '1',
        filePath: 'http://170.80.70.78/pages/1.jpg',
        clippings: [
          {
            articleId: 0,
            coordinates: '',
            page: '1',
            filePath: 'http://170.80.70.78/pages/1.jpg',
          },
          {
            articleId: 0,
            coordinates: '100,200,600,800',
            page: '1',
            filePath: 'http://170.80.70.78/pages/1.jpg',
          },
          {
            articleId: 0,
            coordinates: ' 150,250,700,900 ',
            page: '2',
            filePath: 'http://170.80.70.78/pages/2.jpg',
          },
        ],
      }),
    ])

    expect(seeds).toEqual([
      {
        newsId: '1',
        pageNumber: '1',
        imageUrl: '/pages/1.jpg',
        coordinates: '100,200,600,800',
        index: 0,
        title: 'Title 1',
        text: 'Text 1',
        clientKeywordsFound: [],
      },
      {
        newsId: '1',
        pageNumber: '2',
        imageUrl: '/pages/2.jpg',
        coordinates: '150,250,700,900',
        index: 1,
        title: 'Title 1',
        text: 'Text 1',
        clientKeywordsFound: [],
      },
    ])
  })

  it('falls back to item coordinates when clippings are empty', () => {
    const seeds = buildCropSeedsFromApiNews([
      apiNews(1, {
        coordinates: '100,100,500,500',
        clippings: [],
      }),
      apiNews(2, {
        coordinates: '200,200,600,600',
        clippings: [{ articleId: 0, coordinates: '   ', page: '1', filePath: '' }],
      }),
    ])

    expect(seeds.map((seed) => [seed.newsId, seed.coordinates, seed.index])).toEqual([
      ['1', '100,100,500,500', 0],
      ['2', '200,200,600,600', 0],
    ])
  })

  it('includes clipping pages in the page image map', () => {
    const map = buildPageImageMap([
      apiNews(1, {
        page: '1',
        filePath: 'http://170.80.70.78/pages/1.jpg',
        clippings: [
          {
            articleId: 0,
            coordinates: '100,200,600,800',
            page: '2',
            filePath: 'http://170.80.70.78/pages/2.jpg',
          },
        ],
      }),
    ])

    expect([...map.entries()]).toEqual([
      ['1', '/pages/1.jpg'],
      ['2', '/pages/2.jpg'],
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
