export interface NewsSearchResultDto {
  channelId: number
  channelName?: string
  customerId: number
  customerName?: string
  highlights: string[]
  /** Palavra-chave específica deste customer/channel, quando a API envia um hit por linha. */
  keyword?: string
  keywords?: string[]
  searchedIds: number[]
  /** Canal próprio do veículo, quando a API envia OwnChannel. */
  ownChannel?: boolean
}

export interface ApiNewsClippingDto {
  articleId: number
  coordinates: string
  page: string
  filePath: string
}

export interface ApiNewsItemDto {
  id: number
  title: string
  text: string
  author: string
  publication: string
  coordinates?: string | string[]
  clippings?: ApiNewsClippingDto[]
  section: string
  filePath?: string | null
  page: string
  relatedPage?: string | null
  searchResults: NewsSearchResultDto[]
  done?: boolean
}
