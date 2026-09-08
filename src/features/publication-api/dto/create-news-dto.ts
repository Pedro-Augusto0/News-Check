import type { ApiNewsClippingDto } from './news-dto'

export type CreateNewsClippingDto = ApiNewsClippingDto

export interface CreateNewsRequestDto {
  articleIds: number[]
  title: string
  publication: string
  section: string
  page: string
  text: string
  author: string
  hasPhoto: boolean
  clippings: CreateNewsClippingDto[]
}
