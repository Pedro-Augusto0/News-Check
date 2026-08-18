import { describe, expect, it } from 'vitest'
import type { PublicationDto } from '../dto'
import {
  createEditionPdf,
  formatPublicationLabel,
  mapPublicationToEdition,
  publicationEditionId,
  publicationPdfId,
  toDateOnly,
} from './publication-mappers'

const publication: PublicationDto = {
  id: 42,
  sourceName: 'Gazeta',
  publicationDate: '2026-08-18T12:30:00Z',
}

describe('publication mappers', () => {
  it('preserves the current date and identifier formats', () => {
    expect(toDateOnly(publication.publicationDate)).toBe('2026-08-18')
    expect(formatPublicationLabel('Gazeta', publication.publicationDate)).toBe(
      'Gazeta - 2026-08-18',
    )
    expect(publicationEditionId(publication)).toBe('42')
    expect(publicationPdfId(publication.id)).toBe('pdf-42')
  })

  it('maps a publication to an edition with its placeholder page', () => {
    expect(mapPublicationToEdition(publication)).toEqual({
      id: '42',
      vehicleName: 'Gazeta',
      editionDate: '2026-08-18',
      label: 'Gazeta - 2026-08-18',
      clientKeywords: [],
      pdfs: [
        {
          id: 'pdf-42',
          name: 'Gazeta',
          url: '',
          pages: [
            {
              pageNumber: '1',
              imageUrl: '',
              hasClient: false,
              keywordsFound: [],
              keywordsMissing: [],
              keywordOccurrences: [],
              crops: [],
            },
          ],
        },
      ],
    })
  })

  it('uses provided pages unchanged when creating the edition PDF', () => {
    const pages = mapPublicationToEdition(publication).pdfs[0].pages

    expect(createEditionPdf(publication, pages).pages).toBe(pages)
  })
})
