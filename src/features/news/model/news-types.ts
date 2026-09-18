/** Match de busca: cliente + canal + palavras-chave encontradas. */
export interface NewsClientMatch {
  customerId?: number
  customerName: string
  channelId?: number
  channelName: string
  keywords: string[]
  /** Canal próprio do veículo. */
  ownChannel?: boolean
}

export interface NewsItem {
  id: string
  title: string
  /** Texto completo da notícia (API). */
  text?: string
  /** ID do corte associado; null = ainda precisa de corte manual. */
  cropId: string | null
  clientKeywordsFound?: string[]
  /** Nomes dos clientes (customerName) vindos de searchResults. */
  customerNames?: string[]
  /** Matches estruturados (cliente × canal × palavras-chave). */
  clientMatches?: NewsClientMatch[]
}

/** Notícia persistida na sessão (API + manuais). */
export interface StoredNewsItem extends NewsItem {
  pdfId: string
  /** Identificador da página (ex.: "A11", "1"). */
  pageNumber: string
  /** Caminho da imagem usado como identidade física da página. */
  filePath?: string
  editionId: string
  manual?: boolean
  /** Ordem fixa na lista da página — não muda ao vincular cortes. */
  listOrder?: number
  /** Metadados originais da API (para persistência). */
  author?: string
  section?: string
  suggestedSection?: string
  apiPublication?: string
  /** IDs de artigos da API — inclui originais quando notícias são mescladas. */
  articleIds?: number[]
  /** Página em que a notícia continua, quando a API informa RelatedPage. */
  relatedPage?: string
  /** True quando algum searchResult veio com OwnChannel. */
  hasOwnChannel?: boolean
  /** Notícia já finalizada no backend. */
  done?: boolean
  /** Id da publication_page no backend. */
  publicationPageId?: number
  /** Página marcada como finalizada no backend. */
  finished?: boolean
}

/** Escopo inicial de notícias/cortes visíveis na sessão. */
export type NewsViewFilter = 'all' | 'withClient'
