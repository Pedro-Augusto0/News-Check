import { useMemo } from 'react'
import { useCropsStore } from '@/features/crops'
import { useCurrentPdf } from '@/features/edition-session/hooks'
import { useSessionStore } from '@/features/edition-session'
import { filterPagesByClient } from '@/features/crops/client-stats'
import type { PageData } from '../model'

export function useCurrentPage(): PageData | undefined {
  const pdf = useCurrentPdf()
  const selectedPageNumber = useSessionStore((state) => state.selectedPageNumber)
  return useMemo(
    () => pdf?.pages.find((page) => page.pageNumber === selectedPageNumber),
    [pdf, selectedPageNumber],
  )
}

export function useFilteredPages(): PageData[] {
  const pdf = useCurrentPdf()
  const pageFilter = useSessionStore((state) => state.pageFilter)
  const crops = useCropsStore((state) => state.crops)
  return useMemo(
    () => (pdf ? filterPagesByClient(pdf.pages, pageFilter, crops, pdf.id) : []),
    [pdf, pageFilter, crops],
  )
}
