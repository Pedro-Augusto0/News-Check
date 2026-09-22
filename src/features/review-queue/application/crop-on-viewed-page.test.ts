import { describe, expect, it } from 'vitest'
import type { PageData } from '@/features/page-navigation'
import type { StoredNewsItem } from '@/features/news'
import { resolvePageId } from '@/features/page-navigation/page-key'
import { cropBelongsOnViewedPage, resolveCropPageId } from './crop-on-viewed-page'

function page(pageNumber: string, filePath?: string): PageData {
  return {
    pageNumber,
    imageUrl: '',
    filePath,
    hasClient: false,
    keywordsFound: [],
    keywordsMissing: [],
    keywordOccurrences: [],
    crops: [],
  }
}

function news(
  id: string,
  pageNumber: string,
  filePath?: string,
): StoredNewsItem {
  return {
    id,
    title: id,
    cropId: null,
    pdfId: 'pdf-1',
    editionId: 'ed-1',
    pageNumber,
    filePath,
  }
}

describe('cropBelongsOnViewedPage', () => {
  const page1 = page('1', '/p1.jpg')
  const page3 = page('3', '/p3.jpg')

  it('hides a crop that lives on another page number', () => {
    expect(
      cropBelongsOnViewedPage({
        crop: { pdfId: 'pdf-1', pageNumber: '3', newsItemId: 'n1' },
        pdfId: 'pdf-1',
        page: page1,
        newsItems: { n1: news('n1', '1', '/p1.jpg') },
      }),
    ).toBe(false)
  })

  it('shows a continuation crop on the page it was drawn on', () => {
    expect(
      cropBelongsOnViewedPage({
        crop: { pdfId: 'pdf-1', pageNumber: '3', newsItemId: 'n1' },
        pdfId: 'pdf-1',
        page: page3,
        newsItems: { n1: news('n1', '1', '/p1.jpg') },
      }),
    ).toBe(true)
  })

  it('keeps same-number crops on the news page occurrence', () => {
    const sports = { ...page('3', '/Esportes/3.jpg'), section: 'Esportes' }
    const food = { ...page('3', '/Gastronomia/3.jpg'), section: 'Gastronomia' }
    const sportsNews = news('n1', '3', '/Esportes/3.jpg')

    expect(
      cropBelongsOnViewedPage({
        crop: { pdfId: 'pdf-1', pageNumber: '3', newsItemId: 'n1' },
        pdfId: 'pdf-1',
        page: sports,
        newsItems: { n1: sportsNews },
      }),
    ).toBe(true)
    expect(
      cropBelongsOnViewedPage({
        crop: { pdfId: 'pdf-1', pageNumber: '3', newsItemId: 'n1' },
        pdfId: 'pdf-1',
        page: food,
        newsItems: { n1: sportsNews },
      }),
    ).toBe(false)
  })
})

describe('resolveCropPageId', () => {
  it('navigates to the crop page, not the home news page', () => {
    const pages = [page('1', '/p1.jpg'), page('3', '/p3.jpg')]
    expect(resolveCropPageId({ pageNumber: '3', newsItemId: 'n1' }, pages, news('n1', '1', '/p1.jpg'))).toBe(
      resolvePageId(pages[1]!),
    )
  })

  it('disambiguates same page numbers with the news file path', () => {
    const sports = page('3', '/Esportes/3.jpg')
    const food = page('3', '/Gastronomia/3.jpg')
    expect(
      resolveCropPageId(
        { pageNumber: '3', newsItemId: 'n1' },
        [sports, food],
        news('n1', '3', '/Gastronomia/3.jpg'),
      ),
    ).toBe(resolvePageId(food))
  })
})
