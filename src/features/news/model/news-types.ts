export interface NewsItem {
  id: string
  title: string
  /** Texto completo da notícia (API). */
  text?: string
  /** ID do corte associado; null = ainda precisa de corte manual. */
  cropId: string | null
  clientKeywordsFound?: string[]
}

/** Notícia persistida na sessão (API + manuais). */
export interface StoredNewsItem extends NewsItem {
  pdfId: string
  /** Identificador da página (ex.: "A11", "1"). */
  pageNumber: string
  editionId: string
  manual?: boolean
  /** Ordem fixa na lista da página — não muda ao vincular cortes. */
  listOrder?: number
}

/** Escopo inicial de notícias/cortes visíveis na sessão. */
export type NewsViewFilter = 'all' | 'withClient'
