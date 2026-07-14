import { useMemo } from 'react'
import { useCropsStore } from '@/stores/cropsStore'
import type { Crop } from '@/types/session'
import {
  buildCropDisplayIndexMap,
  buildCropDisplayTree,
  type CropDisplayInfo,
} from '@/utils/cropDisplayTree'

export function usePageCrops(pdfId: string | undefined, pageNumber: number): Crop[] {
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

  return useMemo(() => {
    if (!editionId || !pdfId) return new Map()
    return buildCropDisplayIndexMap(editionId, pdfId, crops, groups)
  }, [crops, groups, editionId, pdfId])
}
