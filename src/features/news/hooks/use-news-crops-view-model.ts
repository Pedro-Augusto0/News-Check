import { useMemo } from 'react'
import { useCropsStore } from '@/features/crops'
import type { PageData } from '@/features/page-navigation'
import { useNewsStore } from '../store'
import type { NewsViewFilter } from '../model'
import { createNewsCropsViewModel, type NewsCropsViewModel } from '../view-model'

interface UseNewsCropsViewModelOptions {
  editionId: string | null | undefined
  pdfId: string | undefined
  pages?: PageData[]
  search?: string
  newsViewFilter?: NewsViewFilter
  keepNewsId?: string | null
}

const EMPTY_VIEW_MODEL: NewsCropsViewModel = {
  displayTree: [],
  pageSections: [],
  filteredPageSections: [],
  cropDisplayIndex: new Map(),
  newsDisplayIndex: new Map(),
  pageCrops: new Map(),
  finalizedCropIds: new Set(),
  clientCropIds: new Set(),
}

export function useNewsCropsViewModel({
  editionId,
  pdfId,
  pages,
  search = '',
  newsViewFilter = 'all',
  keepNewsId,
}: UseNewsCropsViewModelOptions): NewsCropsViewModel {
  const crops = useCropsStore((state) => state.crops)
  const groups = useCropsStore((state) => state.groups)
  const newsItems = useNewsStore((state) => state.items)

  return useMemo(() => {
    if (!editionId || !pdfId) return EMPTY_VIEW_MODEL
    return createNewsCropsViewModel({
      editionId,
      pdfId,
      crops,
      groups,
      newsItems,
      pages,
      search,
      newsViewFilter,
      keepNewsIds: keepNewsId ? [keepNewsId] : undefined,
    })
  }, [
    editionId,
    pdfId,
    crops,
    groups,
    newsItems,
    pages,
    search,
    newsViewFilter,
    keepNewsId,
  ])
}
