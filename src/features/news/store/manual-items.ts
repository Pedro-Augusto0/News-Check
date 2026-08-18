import type { Crop } from '@/features/crops'
import type { StoredNewsItem } from '../model'
import { generateId } from '@/shared/id'
import { nextListOrderForPage } from './transformations'

export function createManualNewsItem(
  items: Record<string, StoredNewsItem>,
  params: {
    editionId: string
    pdfId: string
    pageNumber: string
    title?: string
    text?: string
    cropId?: string | null
    clientKeywordsFound?: string[]
  },
): StoredNewsItem {
  return {
    id: generateId('news'),
    title: params.title ?? 'Nova notícia',
    text: params.text,
    cropId: params.cropId ?? null,
    pdfId: params.pdfId,
    pageNumber: params.pageNumber,
    editionId: params.editionId,
    manual: true,
    clientKeywordsFound: params.clientKeywordsFound,
    listOrder: nextListOrderForPage(items, params.pdfId, params.pageNumber),
  }
}

export function createManualNewsFromCrop(
  items: Record<string, StoredNewsItem>,
  crop: Crop,
  fallback?: StoredNewsItem,
): StoredNewsItem {
  return createManualNewsItem(items, {
    editionId: crop.editionId,
    pdfId: crop.pdfId,
    pageNumber: crop.pageNumber,
    title: crop.title || fallback?.title || 'Sem título',
    text: crop.text || fallback?.text || '',
    cropId: crop.id,
    clientKeywordsFound: crop.clientKeywordsFound ?? fallback?.clientKeywordsFound,
  })
}
