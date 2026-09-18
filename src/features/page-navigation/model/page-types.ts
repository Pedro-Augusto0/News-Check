import type { CropData } from '@/features/crops'
import type { NewsItem } from '@/features/news'
import type { CropRect } from '@/features/crops/geometry'

export interface KeywordOccurrence {
  keyword: string
  rect: CropRect
}

export interface PageData {
  /** Unique occurrence of a printed page (number + section). */
  id?: string
  /** Identificador da página (ex.: "A11", "1"). */
  pageNumber: string
  /** Caderno/seção desta ocorrência, quando o mesmo número existe mais de uma vez. */
  section?: string
  /** URL da imagem scaneada desta página. */
  imageUrl: string
  /** Caminho original do arquivo no scancontrol (para persistência na API). */
  filePath?: string
  hasClient: boolean
  keywordsFound: string[]
  keywordsMissing: string[]
  keywordOccurrences: KeywordOccurrence[]
  crops: CropData[]
  /** Notícias detectadas na página (virão da API). */
  newsItems?: NewsItem[]
  /** Id da publication_page no backend. */
  publicationPageId?: number
  /** Página marcada como finalizada no backend. */
  finished?: boolean
}

export type PageFilter = 'all' | 'withClient' | 'withoutClient'
