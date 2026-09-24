export interface PublicationDto {
  id: number
  sourceName: string
  publicationDate: string
  hasSourceMapping?: boolean
  /** 0 = leitura total, 1 = leitura parcial. */
  readType?: number
}
