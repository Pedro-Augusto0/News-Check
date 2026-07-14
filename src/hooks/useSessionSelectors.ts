import { useMemo } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import { useCropsStore } from '@/stores/cropsStore'
import type { PageData, PdfFile, VehicleEdition } from '@/types/session'
import { filterPagesByClient } from '@/utils/cropClientStats'
export function useCurrentEdition(): VehicleEdition | undefined {
  const editions = useSessionStore((s) => s.editions)
  const selectedEditionId = useSessionStore((s) => s.selectedEditionId)
  return useMemo(
    () => editions.find((e) => e.id === selectedEditionId),
    [editions, selectedEditionId],
  )
}

export function useCurrentPdf(): PdfFile | undefined {
  const edition = useCurrentEdition()
  const selectedPdfId = useSessionStore((s) => s.selectedPdfId)
  return useMemo(
    () => edition?.pdfs.find((p) => p.id === selectedPdfId),
    [edition, selectedPdfId],
  )
}

export function useCurrentPage(): PageData | undefined {
  const pdf = useCurrentPdf()
  const selectedPageNumber = useSessionStore((s) => s.selectedPageNumber)
  return useMemo(
    () => pdf?.pages.find((p) => p.pageNumber === selectedPageNumber),
    [pdf, selectedPageNumber],
  )
}

export function useFilteredPages(): PageData[] {
  const pdf = useCurrentPdf()
  const pageFilter = useSessionStore((s) => s.pageFilter)
  const crops = useCropsStore((s) => s.crops)
  return useMemo(() => {
    if (!pdf) return []
    return filterPagesByClient(pdf.pages, pageFilter, crops, pdf.id)
  }, [pdf, pageFilter, crops])
}