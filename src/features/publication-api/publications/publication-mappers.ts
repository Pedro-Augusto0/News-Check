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

export function publicationEditionId(publication: PublicationDto): string {
  return String(publication.id)
}

export function publicationPdfId(publicationId: number | string): string {
  return `pdf-${publicationId}`
}

function emptyPage(pageNumber: string): PageData {
  return {
    pageNumber,
    imageUrl: '',
    hasClient: false,
    keywordsFound: [],
    keywordsMissing: [],
    keywordOccurrences: [],
    crops: [],
  }
}

export function createEditionPdf(
  publication: PublicationDto,
  pages: PageData[] = [emptyPage('1')],
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
  }
}
