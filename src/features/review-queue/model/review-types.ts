import type { CropRect } from '@/features/crops/geometry'

export type ReviewStatus = 'pending' | 'approved' | 'rejected'

export type ReviewDrawMode = 'off' | 'add' | 'redraw'

export type ReviewWorkMode = 'free' | 'focus'

export type ReviewSuspectReason =
  | 'no-crop'
  | 'too-small'
  | 'too-large'
  | 'overlap'
  | 'thin-strip'
  | 'orphan-crop'
  | 'empty-page'

export type ReviewItemKind = 'news' | 'orphan-crop' | 'empty-page'

export interface ReviewQueueItem {
  id: string
  kind: ReviewItemKind
  editionId: string
  pdfId: string
  pageNumber: string
  newsId: string | null
  cropIds: string[]
  title: string
  text: string
  clientKeywords: string[]
  hasClient: boolean
  suspectReasons: ReviewSuspectReason[]
  sortY: number
  previewRect: CropRect | null
}

export const SUSPECT_REASON_LABEL: Record<ReviewSuspectReason, string> = {
  'no-crop': 'Sem recorte',
  'too-small': 'Recorte pequeno',
  'too-large': 'Recorte grande',
  overlap: 'Sobreposto',
  'thin-strip': 'Faixa estreita',
  'orphan-crop': 'Recorte sem notícia',
  'empty-page': 'Página sem notícia',
}
