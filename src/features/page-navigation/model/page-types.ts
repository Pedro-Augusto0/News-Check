import type { CropData } from '@/features/crops'
import type { NewsItem } from '@/features/news'
import type { CropRect } from '@/features/crops/geometry'

export interface KeywordOccurrence {
  keyword: string
  rect: CropRect
}

export interface PageData {
  /** Identificador da página (ex.: "A11", "1"). */
  pageNumber: string
  /** URL da imagem scaneada desta página. */
  imageUrl: string
  hasClient: boolean
  keywordsFound: string[]
  keywordsMissing: string[]
  keywordOccurrences: KeywordOccurrence[]
  crops: CropData[]
  /** Notícias detectadas na página (virão da API). */
  newsItems?: NewsItem[]
}

export type PageFilter = 'all' | 'withClient' | 'withoutClient'
