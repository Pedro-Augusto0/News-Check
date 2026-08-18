import type { Crop, CropDisplayNode, CropGroup } from '../model'
import type { VehicleEdition } from '@/features/edition-session/model'
import type { StoredNewsItem } from '@/features/news'
import type { CropRect } from '@/features/crops/geometry'

export interface CropsState {
  crops: Record<string, Crop>
  groups: Record<string, CropGroup>
  finalizedPages: Record<string, true>
  selectedCropId: string | null
  editingCropId: string | null
  expandedGroups: Record<string, boolean>
  textModalCropId: string | null
  extractingTextIds: Record<string, true>

  hydrateFromEdition: (edition: VehicleEdition) => void
  addCrop: (params: {
    editionId: string
    pdfId: string
    pageNumber: string
    rect: CropRect
    title?: string
    text?: string
    newsItemId?: string | null
    clientKeywordsFound?: string[]
    id?: string
  }) => string
  upsertApiCrop: (params: {
    id: string
    editionId: string
    pdfId: string
    pageNumber: string
    rect: CropRect
    title: string
    text?: string
    newsItemId: string
    clientKeywordsFound?: string[]
  }) => string
  removeApiSeededCrops: (editionId: string) => void
  addCropToNews: (params: {
    editionId: string
    pdfId: string
    pageNumber: string
    rect: CropRect
    newsItem: StoredNewsItem
  }) => string | null
  updateCropTitle: (cropId: string, title: string) => void
  updateGroupTitle: (groupId: string, title: string) => void
  selectCrop: (cropId: string | null) => void
  setNewsItemIdForRelatedCrops: (rootCropId: string, newsItemId: string) => void
  startEditCrop: (cropId: string) => void
  cancelEditCrop: () => void
  updateCropRect: (cropId: string, rect: CropRect) => void
  commitEditCrop: (cropId: string, rect: CropRect) => void
  mergeCrops: (sourceId: string, targetId: string) => string | null
  reorderGroupCrops: (groupId: string, sourceId: string, targetId: string) => void
  ungroupCrop: (cropId: string) => void
  deleteCrop: (cropId: string) => void
  updateCropText: (cropId: string, text: string) => void
  updateGroupText: (groupId: string, text: string) => void
  finalizeCrop: (cropId: string) => void
  reopenCrop: (cropId: string) => void
  isNewsItemFinalized: (cropId: string) => boolean
  isPageFinalized: (pdfId: string, pageNumber: string) => boolean
  finalizePage: (editionId: string, pdfId: string, pageNumber: string) => void
  reopenPage: (editionId: string, pdfId: string, pageNumber: string) => void
  toggleGroupExpanded: (groupId: string) => void
  openTextModal: (cropOrGroupId: string) => void
  closeTextModal: () => void
  setTextExtracting: (id: string, extracting: boolean) => void
  isTextExtracting: (id: string) => boolean
  getCropsForPage: (pdfId: string, pageNumber: string) => Crop[]
  getDisplayTreeForPage: (editionId: string, pdfId: string, pageNumber: string) => CropDisplayNode[]
  getGroupText: (groupId: string) => string
  getCropText: (cropId: string) => string
  getModalText: () => string
  getModalTitle: () => string
}
