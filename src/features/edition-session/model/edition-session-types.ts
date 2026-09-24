import type { PageData } from '@/features/page-navigation'

/** Documento da edição (antes PDF; agora container de páginas-imagem). */
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
  finished?: boolean
  /** `false` impede a seleção da edição no combo de publicações. */
  hasSourceMapping?: boolean
  /** 0 = leitura total, 1 = leitura parcial. */
  readType?: 0 | 1
}

export interface SessionPayload {
  editions: VehicleEdition[]
}
