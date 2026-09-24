import { describe, expect, it } from 'vitest'
import { pageOccurrenceKey, UNSECTIONED_LABEL } from '@/features/page-navigation/page-key'
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
      hasSourceMapping: true,
      readType: undefined,
      pdfs: [
        {
          id: 'pdf-42',
          name: 'Gazeta',
          url: '',
          pages: [
            {
              id: pageOccurrenceKey('1'),
              pageNumber: '1',
              section: UNSECTIONED_LABEL,
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

  it('keeps publications without source mapping and exposes the read type', () => {
    expect(
      mapPublicationToEdition({
        ...publication,
        hasSourceMapping: false,
        readType: 1,
      }),
    ).toMatchObject({
      hasSourceMapping: false,
      readType: 1,
    })

    expect(
      mapPublicationToEdition({
        ...publication,
        HasSourceMapping: false,
        ReadType: 0,
      } as PublicationDto),
    ).toMatchObject({
      hasSourceMapping: false,
      readType: 0,
    })
  })

  it('uses provided pages unchanged when creating the edition PDF', () => {
    const pages = mapPublicationToEdition(publication).pdfs[0].pages

    expect(createEditionPdf(publication, pages).pages).toBe(pages)
  })
})
