import { beforeEach, describe, expect, it } from 'vitest'
import type { VehicleEdition } from '@/features/edition-session'
import type { StoredNewsItem } from '@/features/news'
import { useCropsStore } from '@/features/crops'
import { useNewsStore } from '@/features/news'
import { handleImageNewsHighlightAtPoint } from './selection-adapter'

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

describe('handleImageNewsHighlightAtPoint', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStores()
  })

  it('selects the news at the point even when nothing is highlighted yet', () => {
    useNewsStore.getState().hydrateFromApiItems(edition, [apiNews])
    const cropId = useCropsStore.getState().addCropToNews({
      editionId: edition.id,
      pdfId: 'pdf-1',
      pageNumber: '1',
      rect: { x: 10, y: 10, width: 20, height: 20 },
      newsItem: apiNews,
    })!
    const crop = useCropsStore.getState().crops[cropId]

    const handled = handleImageNewsHighlightAtPoint(
      [crop],
      15,
      15,
      100,
      100,
      undefined,
      { pdfId: 'pdf-1', pageNumber: '1' },
    )

    expect(handled).toBe(true)
    expect(useNewsStore.getState().selectedNewsItemId).toBe(apiNews.id)
    expect(useCropsStore.getState().selectedCropId).toBe(cropId)
    expect(useNewsStore.getState().isNewsHighlighted(apiNews.id)).toBe(true)
  })

  it('does not select a finalized crop and reports the event as consumed', () => {
    useNewsStore.getState().hydrateFromApiItems(edition, [apiNews])
    const cropId = useCropsStore.getState().addCropToNews({
      editionId: edition.id,
      pdfId: 'pdf-1',
      pageNumber: '1',
      rect: { x: 10, y: 10, width: 20, height: 20 },
      newsItem: apiNews,
    })!
    useCropsStore.getState().finalizeCrop(cropId)
    const crop = useCropsStore.getState().crops[cropId]

    const handled = handleImageNewsHighlightAtPoint(
      [crop],
      15,
      15,
      100,
      100,
    )

    expect(handled).toBe(true)
    expect(useNewsStore.getState().selectedNewsItemId).toBeNull()
    expect(useCropsStore.getState().selectedCropId).toBeNull()
  })

  it('returns false when the point misses every crop', () => {
    expect(handleImageNewsHighlightAtPoint([], 15, 15, 100, 100)).toBe(false)
  })
})
