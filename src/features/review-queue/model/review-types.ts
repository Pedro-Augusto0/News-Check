import type { CropRect } from '@/features/crops/geometry'
import type { NewsClientMatch } from '@/features/news'

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
  section?: string
  clientKeywords: string[]
  customerNames: string[]
  clientMatches: NewsClientMatch[]
  hasClient: boolean
  /** True quando algum searchResult veio com OwnChannel. */
  hasOwnChannel?: boolean
  /** Página da continuação, quando a API envia RelatedPage. */
  relatedPage?: string
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
