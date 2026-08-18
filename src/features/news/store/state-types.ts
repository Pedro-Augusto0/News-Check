import type { VehicleEdition } from '@/features/edition-session'
import type { StoredNewsItem } from '../model'

export type NewsPageHighlightMap = Record<string, Record<string, true>>

export interface NewsHighlightScope {
  pdfId: string
  pageNumber: string
}

export interface NewsState {
  items: Record<string, StoredNewsItem>
  selectedNewsItemId: string | null
  highlightedNewsByPage: NewsPageHighlightMap
  isLoadingNews: boolean
  textModalNewsId: string | null
  hydrateFromEdition: (edition: VehicleEdition) => void
  hydrateFromApiItems: (edition: VehicleEdition, apiItems: StoredNewsItem[]) => void
  setLoadingNews: (loading: boolean) => void
  selectNewsItem: (newsId: string | null) => void
  isNewsHighlighted: (newsId: string, scope?: NewsHighlightScope) => boolean
  getPageHighlights: (pdfId: string, pageNumber: string) => Record<string, true>
  hasPageNewsHighlight: (pdfId: string, pageNumber: string) => boolean
  selectNewsHighlight: (newsId: string, multi: boolean, scope?: NewsHighlightScope) => void
  clearNewsHighlight: (scope?: NewsHighlightScope) => void
  unhighlightNewsItems: (newsIds: string[]) => void
  addManualNewsItem: (params: {
    editionId: string
    pdfId: string
    pageNumber: string
    title?: string
  }) => string
  linkCropToNews: (newsId: string, cropId: string) => void
  unlinkNewsCrop: (newsId: string) => void
  syncNewsCropLink: (newsId: string) => void
  getNewsItem: (newsId: string) => StoredNewsItem | undefined
  updateNewsItemTitle: (newsId: string, title: string) => void
  updateNewsItemText: (newsId: string, text: string) => void
  deleteManualNewsItem: (newsId: string) => boolean
  consolidateNewsAfterCropMerge: (params: {
    keepNewsId: string | null
    removeNewsIds: string[]
  }) => void
  splitNewsForUngroupedCrop: (cropId: string) => void
  getNewsForPdf: (pdfId: string) => StoredNewsItem[]
  findNewsByCropId: (cropId: string) => StoredNewsItem | undefined
  ensureNewsForCrop: (cropId: string) => string | null
  openNewsTextModal: (newsId: string) => void
  closeNewsTextModal: () => void
}
