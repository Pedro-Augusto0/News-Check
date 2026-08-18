export interface NewsSearchResultDto {
  channelId: number
  customerId: number
  highlights: string[]
  searchedIds: number[]
}

export interface ApiNewsItemDto {
  id: number
  title: string
  text: string
  author: string
  publication: string
  coordinates: string
  section: string
  filePath?: string | null
  page: string
  searchResults: NewsSearchResultDto[]
}
