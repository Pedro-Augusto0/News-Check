import type { VehicleEdition } from '@/features/edition-session/model'
import type { NewsClientMatch, StoredNewsItem } from '@/features/news'
import type { PageData } from '@/features/page-navigation'
import { comparePageKeys, toProxiedImageUrl } from '@/features/page-navigation/page-key'
import { normalizeApiCoordinateList } from '@/features/crops/api-coordinates'
import type { ApiNewsClippingDto, ApiNewsItemDto, NewsSearchResultDto } from '../dto'

export interface ApiNewsCropSeed {
  newsId: string
  pageNumber: string
  imageUrl: string
  coordinates: string
  index: number
  title: string
  text: string
  clientKeywordsFound: string[]
}

function collectHighlights(item: ApiNewsItemDto): string[] {
  return uniqueTrimmed(resolveSearchResults(item).flatMap((result) => keywordsFromResult(result)))
}

function collectCustomerNames(item: ApiNewsItemDto): string[] {
  const seen = new Set<string>()
  const names: string[] = []
  for (const result of resolveSearchResults(item)) {
    const name = result.customerName?.trim()
    if (!name) continue
    const key = name.toLocaleLowerCase('pt-BR')
    if (seen.has(key)) continue
    seen.add(key)
    names.push(name)
  }
  return names
}

function uniqueTrimmed(values: unknown): string[] {
  const list = Array.isArray(values) ? values : values == null || values === '' ? [] : [values]
  const seen = new Set<string>()
  const unique: string[] = []
  for (const value of list) {
    const trimmed = keywordFromUnknown(value)
    if (!trimmed) continue
    const key = trimmed.toLocaleLowerCase('pt-BR')
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(trimmed)
  }
  return unique
}

function keywordFromUnknown(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (!value || typeof value !== 'object') return ''
  const record = value as Record<string, unknown>
  for (const key of ['text', 'keyword', 'value', 'highlight', 'term']) {
    if (typeof record[key] === 'string') {
      const trimmed = record[key].trim()
      if (trimmed) return trimmed
    }
  }
  return ''
}

function keywordsFromResult(result: NewsSearchResultDto): string[] {
  const loose = result as NewsSearchResultDto & Record<string, unknown>
  return uniqueTrimmed([
    result.keyword,
    loose.Keyword,
    ...(Array.isArray(result.keywords) ? result.keywords : []),
    ...(Array.isArray(loose.Keywords) ? loose.Keywords : []),
    ...(Array.isArray(result.highlights) ? result.highlights : []),
    ...(Array.isArray(loose.Highlights) ? loose.Highlights : []),
  ])
}

function matchKey(result: NewsSearchResultDto): string {
  const customerId = result.customerId ?? ''
  const channelId = result.channelId ?? ''
  const customerName = (result.customerName ?? '').trim().toLocaleLowerCase('pt-BR')
  const channelName = (result.channelName ?? '').trim().toLocaleLowerCase('pt-BR')
  return `${customerId}|${channelId}|${customerName}|${channelName}`
}

function resolveSearchResults(item: Pick<ApiNewsItemDto, 'searchResults'>): NewsSearchResultDto[] {
  const record = item as Record<string, unknown>
  for (const [key, value] of Object.entries(record)) {
    if (key.replace(/_/g, '').toLowerCase() === 'searchresults' && Array.isArray(value)) {
      return value as NewsSearchResultDto[]
    }
  }
  return item.searchResults ?? []
}

function isOwnChannelFlag(value: unknown): boolean {
  if (value === true || value === 1) return true
  if (typeof value === 'string') return value.trim().toLowerCase() === 'true'
  return false
}

function resolveOwnChannel(result: NewsSearchResultDto): boolean {
  const record = result as NewsSearchResultDto & Record<string, unknown>
  for (const [key, value] of Object.entries(record)) {
    if (key.replace(/_/g, '').toLowerCase() === 'ownchannel' && isOwnChannelFlag(value)) {
      return true
    }
  }
  return isOwnChannelFlag(result.ownChannel)
}

function newsHasOwnChannel(item: Pick<ApiNewsItemDto, 'searchResults'>): boolean {
  return resolveSearchResults(item).some((result) => resolveOwnChannel(result))
}

export function collectClientMatches(item: Pick<ApiNewsItemDto, 'searchResults'>): NewsClientMatch[] {
  const byKey = new Map<string, NewsClientMatch>()

  for (const result of resolveSearchResults(item)) {
    const customerName = result.customerName?.trim() ?? ''
    const channelName = result.channelName?.trim() ?? ''
    const keywords = keywordsFromResult(result)
    if (!customerName && !channelName && keywords.length === 0) continue

    const key = matchKey(result)
    const existing = byKey.get(key)
    if (existing) {
      existing.keywords = uniqueTrimmed([...existing.keywords, ...keywords])
      if (!existing.customerName && customerName) existing.customerName = customerName
      if (!existing.channelName && channelName) existing.channelName = channelName
      if (resolveOwnChannel(result)) existing.ownChannel = true
      continue
    }

    byKey.set(key, {
      customerId: result.customerId,
      customerName,
      channelId: result.channelId,
      channelName,
      keywords,
      ...(resolveOwnChannel(result) ? { ownChannel: true } : {}),
    })
  }

  return [...byKey.values()]
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

function resolveRelatedPage(item: ApiNewsItemDto): string | undefined {
  const loose = item as ApiNewsItemDto & { RelatedPage?: string | number | null }
  const raw = item.relatedPage ?? loose.RelatedPage
  if (raw == null) return undefined
  const value = String(raw).trim()
  return value ? resolvePageKey(value) : undefined
}

function populatedClippings(item: ApiNewsItemDto): ApiNewsClippingDto[] {
  return (item.clippings ?? []).filter((clipping) => clipping.coordinates?.trim())
}

function pushPageAsset(
  map: Map<string, string>,
  page: string | undefined,
  value: string | null | undefined,
  transform: (raw: string) => string,
) {
  const pageKey = resolvePageKey(page ?? '')
  if (map.has(pageKey) || pageKey === '?') return
  const raw = value?.trim()
  if (!raw) return
  const next = transform(raw)
  if (next) map.set(pageKey, next)
}

function collectPageAssets(
  apiNews: ApiNewsItemDto[],
  transform: (raw: string) => string,
): Map<string, string> {
  const map = new Map<string, string>()
  for (const item of apiNews) {
    pushPageAsset(map, item.page, item.filePath, transform)
    for (const clipping of item.clippings ?? []) {
      pushPageAsset(map, clipping.page || item.page, clipping.filePath || item.filePath, transform)
    }
  }
  return map
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
        customerNames: collectCustomerNames(item),
        clientMatches: collectClientMatches(item),
        hasOwnChannel: newsHasOwnChannel(item) || undefined,
        pdfId,
        pageNumber,
        editionId: edition.id,
        listOrder: index,
        author: item.author?.trim() || undefined,
        section: item.section?.trim() || undefined,
        apiPublication: item.publication?.trim() || undefined,
        articleIds: [item.id],
        relatedPage: resolveRelatedPage(item),
        done: item.done === true,
      })
    })
  }

  return items
}

/** Mapa pageKey → imageUrl a partir do payload bruto da API. */
export function buildPageImageMap(apiNews: ApiNewsItemDto[]): Map<string, string> {
  return collectPageAssets(apiNews, (filePath) => toProxiedImageUrl(filePath))
}

/** Mapa pageKey → filePath original da API. */
export function buildPageFilePathMap(apiNews: ApiNewsItemDto[]): Map<string, string> {
  return collectPageAssets(apiNews, (filePath) => filePath)
}

function pushCropSeed(
  seeds: ApiNewsCropSeed[],
  item: ApiNewsItemDto,
  input: { coordinates: string; pageNumber: string; imageUrl: string; index: number },
) {
  seeds.push({
    newsId: String(item.id),
    pageNumber: input.pageNumber,
    imageUrl: input.imageUrl,
    coordinates: input.coordinates,
    index: input.index,
    title: resolveNewsTitle(item),
    text: resolveNewsText(item),
    clientKeywordsFound: collectHighlights(item),
  })
}

export function buildCropSeedsFromApiNews(apiNews: ApiNewsItemDto[]): ApiNewsCropSeed[] {
  const seeds: ApiNewsCropSeed[] = []

  for (const item of apiNews) {
    const clippings = populatedClippings(item)
    if (clippings.length > 0) {
      clippings.forEach((clipping, index) => {
        const imageUrl = toProxiedImageUrl(clipping.filePath || item.filePath)
        if (!imageUrl) return
        pushCropSeed(seeds, item, {
          coordinates: clipping.coordinates.trim(),
          pageNumber: resolvePageKey(clipping.page || item.page),
          imageUrl,
          index,
        })
      })
      continue
    }

    const coordinates = normalizeApiCoordinateList(item.coordinates)
    const imageUrl = toProxiedImageUrl(item.filePath)
    if (!imageUrl) continue

    coordinates.forEach((value, index) => {
      pushCropSeed(seeds, item, {
        coordinates: value,
        pageNumber: resolvePageKey(item.page),
        imageUrl,
        index,
      })
    })
  }

  return seeds
}

export function buildPagesFromNews(
  items: StoredNewsItem[],
  pageImages: Map<string, string> = new Map(),
  pageFilePaths: Map<string, string> = new Map(),
): PageData[] {
  const pageKeys = [
    ...new Set([...items.map((item) => item.pageNumber), ...pageImages.keys(), ...pageFilePaths.keys()]),
  ].sort(comparePageKeys)

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
      filePath: pageFilePaths.get(pageNumber),
      hasClient: keywordsFound.length > 0,
      keywordsFound,
      keywordsMissing: [],
      keywordOccurrences: [],
      crops: [],
    }
  })
}
