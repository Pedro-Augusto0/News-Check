import type { VehicleEdition } from '@/features/edition-session/model'
import type { StoredNewsItem } from '@/features/news'
import type { PageData } from '@/features/page-navigation'
import { comparePageKeys, toProxiedImageUrl } from '@/features/page-navigation/page-key'
import type { ApiNewsItemDto } from '../dto'

export interface ApiNewsCropSeed {
  newsId: string
  pageNumber: string
  imageUrl: string
  coordinates: string
  title: string
  text: string
  clientKeywordsFound: string[]
}

function collectHighlights(item: ApiNewsItemDto): string[] {
  const seen = new Set<string>()
  const highlights: string[] = []
  for (const result of item.searchResults ?? []) {
    for (const highlight of result.highlights ?? []) {
      const trimmed = highlight.trim()
      if (!trimmed || seen.has(trimmed)) continue
      seen.add(trimmed)
      highlights.push(trimmed)
    }
  }
  return highlights
}

function resolvePageKey(page: string): string {
  const trimmed = page?.trim()
  return trimmed || '?'
}

function resolveNewsTitle(item: ApiNewsItemDto): string {
  const title = item.title?.trim()
  if (title) return title
  const text = item.text?.trim()
  if (text && text !== '.') return text.slice(0, 120)
  return 'Sem título'
}

function resolveNewsText(item: ApiNewsItemDto): string {
  const text = item.text?.trim()
  if (!text || text === '.') return ''
  return text
}

export function mapApiNewsToStoredItems(
  edition: VehicleEdition,
  apiNews: ApiNewsItemDto[],
): StoredNewsItem[] {
  const pdfId = edition.pdfs[0]?.id
  if (!pdfId) return []

  const byPage = new Map<string, ApiNewsItemDto[]>()
  for (const item of apiNews) {
    const pageNumber = resolvePageKey(item.page)
    const list = byPage.get(pageNumber) ?? []
    list.push(item)
    byPage.set(pageNumber, list)
  }

  const items: StoredNewsItem[] = []
  for (const [pageNumber, pageItems] of [...byPage.entries()].sort(([a], [b]) =>
    comparePageKeys(a, b),
  )) {
    pageItems.forEach((item, index) => {
      items.push({
        id: String(item.id),
        title: resolveNewsTitle(item),
        text: resolveNewsText(item),
        cropId: null,
        clientKeywordsFound: collectHighlights(item),
        pdfId,
        pageNumber,
        editionId: edition.id,
        listOrder: index,
      })
    })
  }

  return items
}

/** Mapa pageKey → imageUrl a partir do payload bruto da API. */
export function buildPageImageMap(apiNews: ApiNewsItemDto[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const item of apiNews) {
    const pageKey = resolvePageKey(item.page)
    if (map.has(pageKey)) continue
    const imageUrl = toProxiedImageUrl(item.filePath)
    if (imageUrl) map.set(pageKey, imageUrl)
  }
  return map
}

export function buildCropSeedsFromApiNews(apiNews: ApiNewsItemDto[]): ApiNewsCropSeed[] {
  const seeds: ApiNewsCropSeed[] = []

  for (const item of apiNews) {
    const coordinates = item.coordinates?.trim()
    const imageUrl = toProxiedImageUrl(item.filePath)
    if (!coordinates || !imageUrl) continue

    seeds.push({
      newsId: String(item.id),
      pageNumber: resolvePageKey(item.page),
      imageUrl,
      coordinates,
      title: resolveNewsTitle(item),
      text: resolveNewsText(item),
      clientKeywordsFound: collectHighlights(item),
    })
  }

  return seeds
}

export function buildPagesFromNews(
  items: StoredNewsItem[],
  pageImages: Map<string, string> = new Map(),
): PageData[] {
  const pageKeys = [...new Set(items.map((item) => item.pageNumber))].sort(comparePageKeys)

  if (pageKeys.length === 0) {
    return [
      {
        pageNumber: '1',
        imageUrl: '',
        hasClient: false,
        keywordsFound: [],
        keywordsMissing: [],
        keywordOccurrences: [],
        crops: [],
      },
    ]
  }

  return pageKeys.map((pageNumber) => {
    const pageNews = items.filter((item) => item.pageNumber === pageNumber)
    const keywordsFound = [
      ...new Set(pageNews.flatMap((item) => item.clientKeywordsFound ?? [])),
    ]
    return {
      pageNumber,
      imageUrl: pageImages.get(pageNumber) ?? '',
      hasClient: keywordsFound.length > 0,
      keywordsFound,
      keywordsMissing: [],
      keywordOccurrences: [],
      crops: [],
    }
  })
}
