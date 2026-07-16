import type { CropRect } from './geometry'

export interface KeywordOccurrence {
  keyword: string
  rect: CropRect
}

export interface CropData {
  id: string
  rect: CropRect
  title: string
  text: string
  groupId: string | null
  finalized: boolean
  /** Número fixo do corte no PDF — não muda ao adicionar outros cortes. */
  displayIndex: number
  /** Palavras-chave do cliente encontradas nesta notícia (virá da API). */
  clientKeywordsFound?: string[]
  /** Vínculo com notícia detectada pela API ou criada manualmente. */
  newsItemId?: string | null
}

/** Notícia detectada automaticamente; pode ou não ter corte associado. */
export interface NewsItem {
  id: string
  title: string
  /** ID do corte associado; null = ainda precisa de corte manual. */
  cropId: string | null
  clientKeywordsFound?: string[]
}

/** Notícia persistida na sessão (API + manuais). */
export interface StoredNewsItem extends NewsItem {
  pdfId: string
  pageNumber: number
  editionId: string
  manual?: boolean
}

export interface PageData {
  pageNumber: number
  hasClient: boolean
  keywordsFound: string[]
  keywordsMissing: string[]
  keywordOccurrences: KeywordOccurrence[]
  crops: CropData[]
  /** Notícias detectadas na página (virão da API). */
  newsItems?: NewsItem[]
}

export interface PdfFile {
  id: string
  name: string
  url: string
  pages: PageData[]
}

export interface VehicleEdition {
  id: string
  vehicleName: string
  editionDate: string
  label: string
  clientKeywords: string[]
  pdfs: PdfFile[]
}

export interface SessionPayload {
  editions: VehicleEdition[]
}

export interface Crop extends CropData {
  pdfId: string
  pageNumber: number
  editionId: string
}

export interface CropGroup {
  id: string
  title: string
  cropIds: string[]
  editionId: string
}

export type PageFilter = 'all' | 'withClient' | 'withoutClient'

/** Escopo inicial de notícias/cortes visíveis na sessão. */
export type NewsViewFilter = 'all' | 'withClient'

export interface CropDisplayNode {
  type: 'crop' | 'group'
  id: string
  crop?: Crop
  group?: CropGroup
  children?: CropDisplayNode[]
}

export interface PersistedCropState {
  crops: Record<string, Crop>
  groups: Record<string, CropGroup>
  /** Chaves `${pdfId}:${pageNumber}` de páginas revisadas pelo usuário. */
  finalizedPages?: Record<string, true>
}
