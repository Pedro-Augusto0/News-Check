import { describe, expect, it } from 'vitest'
import { createManualNewsItem } from './manual-items'

describe('createManualNewsItem', () => {
  it('preserves the physical page metadata needed by review creation', () => {
    const item = createManualNewsItem(
      {},
      {
        editionId: 'edition-1',
        pdfId: 'pdf-1',
        pageNumber: '1',
        filePath: 'http://host/jornal/DESTEMPERADOS/1.jpg',
        section: 'DESTEMPERADOS',
      },
    )

    expect(item).toMatchObject({
      pageNumber: '1',
      filePath: 'http://host/jornal/DESTEMPERADOS/1.jpg',
      section: 'DESTEMPERADOS',
      title: 'Nova notícia',
      manual: true,
    })
  })
})
