import { useMemo } from 'react'
import { useSessionStore } from '../store'
import type { PdfFile, VehicleEdition } from '../model'

export function useCurrentEdition(): VehicleEdition | undefined {
  const editions = useSessionStore((state) => state.editions)
  const selectedEditionId = useSessionStore((state) => state.selectedEditionId)
  return useMemo(
    () => editions.find((edition) => edition.id === selectedEditionId),
    [editions, selectedEditionId],
  )
}

export function useCurrentPdf(): PdfFile | undefined {
  const edition = useCurrentEdition()
  const selectedPdfId = useSessionStore((state) => state.selectedPdfId)
  return useMemo(
    () => edition?.pdfs.find((pdf) => pdf.id === selectedPdfId),
    [edition, selectedPdfId],
  )
}
