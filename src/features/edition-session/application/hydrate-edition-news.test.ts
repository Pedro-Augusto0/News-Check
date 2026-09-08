import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VehicleEdition } from '../model'

const mocks = vi.hoisted(() => ({
  events: [] as string[],
  loadNewsForEdition: vi.fn(),
  seedCropsFromApiCoordinates: vi.fn(async () => {
    mocks.events.push('seed-crops')
  }),
  setLoadingNews: vi.fn((loading: boolean) => {
    mocks.events.push(`loading:${loading}`)
  }),
  hydrateFromApiItems: vi.fn(() => {
    mocks.events.push('hydrate-news')
  }),
  updateEditionPages: vi.fn(() => {
    mocks.events.push('update-pages')
  }),
  seedDoneFromApi: vi.fn(() => {
    mocks.events.push('seed-done')
  }),
}))

vi.mock('@/features/publication-api/news/news-api', () => ({
  loadNewsForEdition: mocks.loadNewsForEdition,
}))
vi.mock('@/features/news', () => ({
  useNewsStore: {
    getState: () => ({
      hydrateFromApiItems: mocks.hydrateFromApiItems,
      setLoadingNews: mocks.setLoadingNews,
    }),
  },
}))
vi.mock('../store', () => ({
  useSessionStore: {
    getState: () => ({ updateEditionPages: mocks.updateEditionPages }),
  },
}))
vi.mock('./seed-api-crops', () => ({
  seedCropsFromApiCoordinates: mocks.seedCropsFromApiCoordinates,
}))
vi.mock('@/features/review-queue/store', () => ({
  useReviewQueueStore: {
    getState: () => ({ seedDoneFromApi: mocks.seedDoneFromApi }),
  },
}))

import { hydrateEditionNews } from './hydrate-edition-news'

const edition: VehicleEdition = {
  id: 'edition-1',
  vehicleName: 'Gazeta',
  editionDate: '2026-08-18',
  label: 'Gazeta - 2026-08-18',
  clientKeywords: [],
  pdfs: [{ id: 'pdf-1', name: 'Gazeta', url: '', pages: [] }],
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

describe('hydrateEditionNews', () => {
  beforeEach(() => {
    mocks.events.length = 0
    vi.clearAllMocks()
  })

  it('hydrates pages, news and crops in order', async () => {
    mocks.loadNewsForEdition.mockResolvedValue({
      items: [{ id: '1', done: true, title: 'Done', cropId: null, pdfId: 'pdf-1', pageNumber: '1', editionId: edition.id }],
      pages: [],
      cropSeeds: [],
    })

    await hydrateEditionNews(edition)

    expect(mocks.events).toEqual([
      'loading:true',
      'update-pages',
      'hydrate-news',
      'seed-crops',
      'seed-done',
      'loading:false',
    ])
    expect(mocks.seedDoneFromApi).toHaveBeenCalledWith('edition-1', ['1'])
  })

  it('deduplicates concurrent hydrations for the same edition', async () => {
    mocks.loadNewsForEdition.mockResolvedValue({
      items: [],
      pages: [],
      cropSeeds: [],
    })

    await Promise.all([hydrateEditionNews(edition), hydrateEditionNews(edition)])

    expect(mocks.loadNewsForEdition).toHaveBeenCalledTimes(1)
    expect(mocks.updateEditionPages).toHaveBeenCalledTimes(1)
    expect(mocks.hydrateFromApiItems).toHaveBeenCalledTimes(1)
    expect(mocks.seedCropsFromApiCoordinates).toHaveBeenCalledTimes(1)
  })

  it('ignores a stale response when a newer request finishes first', async () => {
    const stale = deferred<{ items: []; pages: []; cropSeeds: [] }>()
    const current = deferred<{ items: []; pages: []; cropSeeds: [] }>()
    mocks.loadNewsForEdition
      .mockReturnValueOnce(stale.promise)
      .mockReturnValueOnce(current.promise)

    const staleRequest = hydrateEditionNews({ ...edition, id: 'stale' })
    const currentRequest = hydrateEditionNews({ ...edition, id: 'current' })

    current.resolve({ items: [], pages: [], cropSeeds: [] })
    await currentRequest
    stale.resolve({ items: [], pages: [], cropSeeds: [] })
    await staleRequest

    expect(mocks.updateEditionPages).toHaveBeenCalledTimes(1)
    expect(mocks.updateEditionPages).toHaveBeenCalledWith('current', [])
    expect(mocks.hydrateFromApiItems).toHaveBeenCalledTimes(1)
    expect(mocks.seedCropsFromApiCoordinates).toHaveBeenCalledTimes(1)
    expect(mocks.events.filter((event) => event === 'loading:false')).toHaveLength(1)
  })
})
