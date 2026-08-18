import { beforeEach, describe, expect, it } from 'vitest'
import type { VehicleEdition } from '@/features/edition-session'
import type { StoredNewsItem } from '@/features/news'
import { useCropsStore } from '@/features/crops'
import { useNewsStore } from '@/features/news'

const edition: VehicleEdition = {
  id: 'edition-1',
  vehicleName: 'Gazeta',
  editionDate: '2026-08-18',
  label: 'Gazeta - 2026-08-18',
  clientKeywords: [],
  pdfs: [{ id: 'pdf-1', name: 'Gazeta', url: '', pages: [] }],
}

const apiNews: StoredNewsItem = {
  id: 'news-1',
  title: 'News title',
  text: 'News text',
  cropId: null,
  clientKeywordsFound: ['client'],
  pdfId: 'pdf-1',
  pageNumber: '1',
  editionId: 'edition-1',
  listOrder: 0,
}

function resetStores() {
  useCropsStore.setState({
    crops: {},
    groups: {},
    finalizedPages: {},
    selectedCropId: null,
    editingCropId: null,
    expandedGroups: {},
    textModalCropId: null,
    extractingTextIds: {},
  })
  useNewsStore.setState({
    items: {},
    selectedNewsItemId: null,
    highlightedNewsByPage: {},
    isLoadingNews: false,
    textModalNewsId: null,
  })
}

describe('store persistence and integration', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStores()
  })

  it('persists crops under the edition key and restores them on hydrate', () => {
    useCropsStore.getState().addCrop({
      id: 'crop-1',
      editionId: edition.id,
      pdfId: 'pdf-1',
      pageNumber: 'A2',
      rect: { x: 10, y: 20, width: 30, height: 40 },
      title: 'Persisted crop',
      text: 'Persisted text',
    })
    useCropsStore.getState().finalizePage(edition.id, 'pdf-1', 'A2')

    const persisted = JSON.parse(
      localStorage.getItem('feature-crops-state-edition-1') ?? 'null',
    )
    expect(persisted).toEqual({
      crops: {
        'crop-1': expect.objectContaining({
          id: 'crop-1',
          title: 'Persisted crop',
          displayIndex: 1,
          finalized: true,
        }),
      },
      groups: {},
      finalizedPages: { 'pdf-1:A2': true },
    })

    resetStores()
    useCropsStore.getState().hydrateFromEdition(edition)

    expect(useCropsStore.getState().crops['crop-1']).toMatchObject({
      title: 'Persisted crop',
      text: 'Persisted text',
      finalized: true,
    })
    expect(useCropsStore.getState().finalizedPages).toEqual({ 'pdf-1:A2': true })
  })

  it('restores manual news while hydrating an edition', () => {
    const newsId = useNewsStore.getState().addManualNewsItem({
      editionId: edition.id,
      pdfId: 'pdf-1',
      pageNumber: '1',
      title: 'Manual news',
    })

    expect(
      JSON.parse(localStorage.getItem('feature-crops-news-edition-1') ?? 'null'),
    ).toEqual({
      items: {
        [newsId]: expect.objectContaining({
          id: newsId,
          manual: true,
          title: 'Manual news',
        }),
      },
    })

    resetStores()
    useNewsStore.getState().hydrateFromEdition(edition)

    expect(useNewsStore.getState().items[newsId]).toMatchObject({
      manual: true,
      title: 'Manual news',
      cropId: null,
    })
  })

  it('links both stores when a crop is added to an existing news item', () => {
    useNewsStore.getState().hydrateFromApiItems(edition, [apiNews])

    const cropId = useCropsStore.getState().addCropToNews({
      editionId: edition.id,
      pdfId: 'pdf-1',
      pageNumber: '1',
      rect: { x: 10, y: 10, width: 20, height: 20 },
      newsItem: apiNews,
    })

    expect(cropId).not.toBeNull()
    expect(useCropsStore.getState().crops[cropId!]).toMatchObject({
      newsItemId: apiNews.id,
      title: apiNews.title,
      text: apiNews.text,
      clientKeywordsFound: apiNews.clientKeywordsFound,
    })
    expect(useNewsStore.getState().items[apiNews.id].cropId).toBe(cropId)

    const persistedNews = JSON.parse(
      localStorage.getItem('feature-crops-news-edition-1') ?? 'null',
    )
    expect(persistedNews.items[apiNews.id].cropId).toBe(cropId)
  })

  it('merges crops, consolidates news and preserves combined text', () => {
    const secondNews = { ...apiNews, id: 'news-2', title: 'Second', text: 'Second text' }
    useNewsStore.getState().hydrateFromApiItems(edition, [apiNews, secondNews])
    const firstCrop = useCropsStore.getState().addCropToNews({
      editionId: edition.id,
      pdfId: 'pdf-1',
      pageNumber: '1',
      rect: { x: 0, y: 10, width: 20, height: 20 },
      newsItem: apiNews,
    })!
    const secondCrop = useCropsStore.getState().addCropToNews({
      editionId: edition.id,
      pdfId: 'pdf-1',
      pageNumber: '1',
      rect: { x: 0, y: 40, width: 20, height: 20 },
      newsItem: secondNews,
    })!

    const groupId = useCropsStore.getState().mergeCrops(secondCrop, firstCrop)

    expect(groupId).not.toBeNull()
    expect(useCropsStore.getState().groups[groupId!].cropIds).toEqual([firstCrop, secondCrop])
    expect(useCropsStore.getState().getGroupText(groupId!)).toBe('News text\n\nSecond text')
    expect(useNewsStore.getState().items['news-2']).toBeUndefined()
    expect(useNewsStore.getState().items['news-1']).toMatchObject({
      cropId: firstCrop,
      text: 'News text\n\nSecond text',
    })
  })

  it('splits the news link when a crop is ungrouped', () => {
    useNewsStore.getState().hydrateFromApiItems(edition, [apiNews])
    const firstCrop = useCropsStore.getState().addCropToNews({
      editionId: edition.id,
      pdfId: 'pdf-1',
      pageNumber: '1',
      rect: { x: 0, y: 10, width: 20, height: 20 },
      newsItem: apiNews,
    })!
    const secondCrop = useCropsStore.getState().addCropToNews({
      editionId: edition.id,
      pdfId: 'pdf-1',
      pageNumber: '1',
      rect: { x: 0, y: 40, width: 20, height: 20 },
      newsItem: apiNews,
    })!
    useCropsStore.getState().ungroupCrop(secondCrop)

    const splitNewsId = useCropsStore.getState().crops[secondCrop].newsItemId
    expect(splitNewsId).toBeTruthy()
    expect(splitNewsId).not.toBe(apiNews.id)
    expect(useNewsStore.getState().items[splitNewsId!]).toMatchObject({
      cropId: secondCrop,
      manual: true,
      text: 'News text',
    })
    expect(useNewsStore.getState().items[apiNews.id].cropId).toBe(firstCrop)
  })

  it('keeps delete cascades and modal fallback synchronized', () => {
    const newsId = useNewsStore.getState().addManualNewsItem({
      editionId: edition.id,
      pdfId: 'pdf-1',
      pageNumber: '1',
      title: 'Manual',
    })
    const cropId = useCropsStore.getState().addCrop({
      id: 'crop-manual',
      editionId: edition.id,
      pdfId: 'pdf-1',
      pageNumber: '1',
      rect: { x: 0, y: 0, width: 10, height: 10 },
      newsItemId: newsId,
    })
    useNewsStore.getState().linkCropToNews(newsId, cropId)
    useCropsStore.getState().openTextModal(cropId)

    useCropsStore.getState().deleteCrop(cropId)

    expect(useCropsStore.getState().crops[cropId]).toBeUndefined()
    expect(useCropsStore.getState().textModalCropId).toBeNull()
    expect(useNewsStore.getState().textModalNewsId).toBe(newsId)

    const replacementCrop = useCropsStore.getState().addCrop({
      id: 'crop-replacement',
      editionId: edition.id,
      pdfId: 'pdf-1',
      pageNumber: '1',
      rect: { x: 0, y: 0, width: 10, height: 10 },
      newsItemId: newsId,
    })
    useNewsStore.getState().linkCropToNews(newsId, replacementCrop)
    expect(useNewsStore.getState().deleteManualNewsItem(newsId)).toBe(true)
    expect(useCropsStore.getState().crops[replacementCrop]).toBeUndefined()
    expect(useNewsStore.getState().items[newsId]).toBeUndefined()
  })

  it('scopes highlights by page and clears them on finalize', () => {
    useNewsStore.getState().hydrateFromApiItems(edition, [apiNews])
    const cropId = useCropsStore.getState().addCropToNews({
      editionId: edition.id,
      pdfId: 'pdf-1',
      pageNumber: '1',
      rect: { x: 0, y: 0, width: 10, height: 10 },
      newsItem: apiNews,
    })!
    useNewsStore.getState().selectNewsHighlight(apiNews.id, false)
    useNewsStore.getState().selectNewsHighlight('other-news', false, {
      pdfId: 'pdf-1',
      pageNumber: '2',
    })

    useCropsStore.getState().finalizeCrop(cropId)

    expect(useNewsStore.getState().isNewsHighlighted(apiNews.id)).toBe(false)
    expect(useNewsStore.getState().getPageHighlights('pdf-1', '2')).toEqual({
      'other-news': true,
    })
    expect(useCropsStore.getState().isNewsItemFinalized(cropId)).toBe(true)
  })
})
