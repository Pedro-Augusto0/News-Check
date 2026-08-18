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
}

export interface SessionPayload {
  editions: VehicleEdition[]
}
