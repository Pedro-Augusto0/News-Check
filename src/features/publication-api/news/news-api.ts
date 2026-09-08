import type { VehicleEdition } from '@/features/edition-session/model'
import type { StoredNewsItem } from '@/features/news'
import type { PageData } from '@/features/page-navigation'
import type { ApiNewsItemDto } from '../dto'
import { apiFetch } from '../http/api-client'
import { toDateOnly } from '../publications/publication-mappers'
import {
  buildCropSeedsFromApiNews,
  buildPageFilePathMap,
  buildPageImageMap,
  buildPagesFromNews,
  mapApiNewsToStoredItems,
  type ApiNewsCropSeed,
} from './news-mappers'

function newsListPath(sourceName: string, publicationDate: string): string {
  const params = new URLSearchParams({
    sourceName,
    publicationDate: toDateOnly(publicationDate),
  })
  return `/printed-clipping/Info4AINews/news/list?${params.toString()}`
}

function newsListKey(sourceName: string, publicationDate: string): string {
  return `${sourceName}\0${toDateOnly(publicationDate)}`
}

const inflightNewsListRequests = new Map<string, Promise<ApiNewsItemDto[]>>()

export async function fetchNewsByPublication(
  sourceName: string,
  publicationDate: string,
): Promise<ApiNewsItemDto[]> {
  const key = newsListKey(sourceName, publicationDate)
  const inflight = inflightNewsListRequests.get(key)
  if (inflight) return inflight

  const promise = apiFetch<ApiNewsItemDto[]>(newsListPath(sourceName, publicationDate), {
    method: 'POST',
    body: '',
  })

  inflightNewsListRequests.set(key, promise)
  try {
    return await promise
  } finally {
    if (inflightNewsListRequests.get(key) === promise) {
      inflightNewsListRequests.delete(key)
    }
  }
}

export async function loadNewsForEdition(edition: VehicleEdition): Promise<{
  items: StoredNewsItem[]
  pages: PageData[]
  cropSeeds: ApiNewsCropSeed[]
}> {
  const apiNews = await fetchNewsByPublication(edition.vehicleName, edition.editionDate)
  const items = mapApiNewsToStoredItems(edition, apiNews)
  const pageImages = buildPageImageMap(apiNews)
  const pageFilePaths = buildPageFilePathMap(apiNews)
  const pages = buildPagesFromNews(items, pageImages, pageFilePaths)
  const cropSeeds = buildCropSeedsFromApiNews(apiNews)
  return { items, pages, cropSeeds }
}
