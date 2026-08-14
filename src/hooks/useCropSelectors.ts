import { useMemo } from 'react'
import { useCropsStore } from '@/stores/cropsStore'
import { useNewsStore } from '@/stores/newsStore'
import type { Crop } from '@/types/session'
import {
  buildCropDisplayTree,
  buildCropsByPageSections,
  type CropDisplayInfo,
} from '@/utils/cropDisplayTree'
import { buildCropDisplayIndexMapFromNewsSections } from '@/utils/newsDisplayIndex'
import { buildNewsPageSections } from '@/utils/pendingNews'

export function usePageCrops(pdfId: string | undefined, pageNumber: string): Crop[] {
  const crops = useCropsStore((s) => s.crops)
  return useMemo(
    () =>
      pdfId
        ? Object.values(crops).filter((c) => c.pdfId === pdfId && c.pageNumber === pageNumber)
        : [],
    [crops, pdfId, pageNumber],
  )
}

export function useCropDisplayTree(
  editionId: string | null | undefined,
  pdfId: string | undefined,
) {
  const crops = useCropsStore((s) => s.crops)
  const groups = useCropsStore((s) => s.groups)

  return useMemo(() => {
    if (!editionId || !pdfId) return []
    return buildCropDisplayTree(editionId, pdfId, crops, groups)
  }, [crops, groups, editionId, pdfId])
}

export function useCropDisplayIndexMap(
  editionId: string | null | undefined,
  pdfId: string | undefined,
): Map<string, CropDisplayInfo> {
  const crops = useCropsStore((s) => s.crops)
  const groups = useCropsStore((s) => s.groups)
  const newsItems = useNewsStore((s) => s.items)

  return useMemo(() => {
    if (!editionId || !pdfId) return new Map()

    const tree = buildCropDisplayTree(editionId, pdfId, crops, groups)
    const pdfNews = Object.values(newsItems).filter((item) => item.pdfId === pdfId)
    const cropSections = buildCropsByPageSections(tree, pdfNews)
    const pageSections = buildNewsPageSections(cropSections, pdfNews, pdfId, crops)

    return buildCropDisplayIndexMapFromNewsSections(pageSections)
  }, [crops, groups, newsItems, editionId, pdfId])
}
