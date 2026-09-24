import { emptyPageData } from '@/features/page-navigation/page-key'
import type { PdfFile, VehicleEdition } from '@/features/edition-session/model'
import type { PageData } from '@/features/page-navigation'
import type { PublicationDto } from '../dto'

/** Extrai `YYYY-MM-DD` de um ISO datetime. */
export function toDateOnly(value: string): string {
  return value.slice(0, 10)
}

export function formatPublicationLabel(sourceName: string, publicationDate: string): string {
  return `${sourceName} - ${toDateOnly(publicationDate)}`
}

export function resolveHasSourceMapping(publication: PublicationDto): boolean {
  const loose = publication as PublicationDto & { HasSourceMapping?: boolean }
  return (publication.hasSourceMapping ?? loose.HasSourceMapping) !== false
}

export function resolveReadType(publication: PublicationDto): 0 | 1 | undefined {
  const loose = publication as PublicationDto & { ReadType?: number }
  const value = publication.readType ?? loose.ReadType
  if (value === 0 || value === 1) return value
  return undefined
}

export function readTypeLabel(readType: number | undefined): string | null {
  if (readType === 0) return 'Leitura total'
  if (readType === 1) return 'Leitura parcial'
  return null
}

export function publicationEditionId(publication: PublicationDto): string {
  return String(publication.id)
}

export function publicationPdfId(publicationId: number | string): string {
  return `pdf-${publicationId}`
}

export function createEditionPdf(
  publication: PublicationDto,
  pages: PageData[] = [emptyPageData('1')],
): PdfFile {
  return {
    id: publicationPdfId(publication.id),
    name: publication.sourceName,
    url: '',
    pages,
  }
}

export function mapPublicationToEdition(publication: PublicationDto): VehicleEdition {
  const editionDate = toDateOnly(publication.publicationDate)
  return {
    id: publicationEditionId(publication),
    vehicleName: publication.sourceName,
    editionDate,
    label: formatPublicationLabel(publication.sourceName, publication.publicationDate),
    clientKeywords: [],
    pdfs: [createEditionPdf(publication)],
    hasSourceMapping: resolveHasSourceMapping(publication),
    readType: resolveReadType(publication),
  }
}
