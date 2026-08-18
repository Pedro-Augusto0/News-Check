import type { VehicleEdition } from '@/features/edition-session/model'
import type { StoredNewsItem } from '@/features/news'
import type { PageData } from '@/features/page-navigation'
import type { ApiNewsItemDto } from '../dto'
import { apiFetch } from '../http/api-client'
import { toDateOnly } from '../publications/publication-mappers'
import {
  buildCropSeedsFromApiNews,
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
  return `/Info4AINews/news/list?${params.toString()}`
}

export async function fetchNewsByPublication(
  sourceName: string,
  publicationDate: string,
): Promise<ApiNewsItemDto[]> {
  return apiFetch<ApiNewsItemDto[]>(newsListPath(sourceName, publicationDate), {
    method: 'POST',
    body: '',
  })
}

export async function loadNewsForEdition(edition: VehicleEdition): Promise<{
  items: StoredNewsItem[]
  pages: PageData[]
  cropSeeds: ApiNewsCropSeed[]
}> {
  const apiNews = await fetchNewsByPublication(edition.vehicleName, edition.editionDate)
  const items = mapApiNewsToStoredItems(edition, apiNews)
  const pageImages = buildPageImageMap(apiNews)
  const pages = buildPagesFromNews(items, pageImages)
  const cropSeeds = buildCropSeedsFromApiNews(apiNews)
  return { items, pages, cropSeeds }
}
