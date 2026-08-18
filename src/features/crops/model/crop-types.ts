import type { CropRect } from '@/features/crops/geometry'

export interface CropData {
  id: string
  rect: CropRect
  title: string
  text: string
  groupId: string | null
  finalized: boolean
  /** Número fixo do corte na página — não muda ao adicionar outros cortes. */
  displayIndex: number
  /** Palavras-chave do cliente encontradas nesta notícia (virá da API). */
  clientKeywordsFound?: string[]
  /** Vínculo com notícia detectada pela API ou criada manualmente. */
  newsItemId?: string | null
}

export interface Crop extends CropData {
  pdfId: string
  pageNumber: string
  editionId: string
}

export interface CropGroup {
  id: string
  title: string
  cropIds: string[]
  editionId: string
}

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
