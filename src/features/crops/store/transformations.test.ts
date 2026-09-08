import { describe, expect, it } from 'vitest'
import type { Crop } from '../model'
import { combineGroupCropTexts, concatUniqueTexts } from './transformations'

function crop(id: string, text: string, newsItemId: string | null = null): Crop {
  return {
    id,
    editionId: 'e1',
    pdfId: 'p1',
    pageNumber: '1',
    rect: { x: 0, y: 0, width: 10, height: 10 },
    title: id,
    text,
    groupId: null,
    finalized: false,
    displayIndex: 1,
    newsItemId,
    clientKeywordsFound: [],
  }
}

describe('concatUniqueTexts', () => {
  it('joins distinct trimmed texts', () => {
    expect(concatUniqueTexts([' Primeiro ', 'Segundo', 'Primeiro'])).toBe('Primeiro\n\nSegundo')
  })

  it('skips empty values', () => {
    expect(concatUniqueTexts(['', '  ', undefined, 'Ok'])).toBe('Ok')
  })
})

describe('combineGroupCropTexts', () => {
  it('concatenates news texts when crops have no text of their own', () => {
    const crops = {
      a: crop('a', '', 'news-1'),
      b: crop('b', '', 'news-2'),
    }
    const combined = combineGroupCropTexts(crops, ['a', 'b'], {
      'news-1': { text: 'Artigo um' } as never,
      'news-2': { text: 'Artigo dois' } as never,
    })
    expect(combined.a?.text).toBe('Artigo um\n\nArtigo dois')
    expect(combined.b?.text).toBe('')
  })

  it('does not duplicate a crop text that already matches the news text', () => {
    const crops = {
      a: crop('a', 'Artigo um', 'news-1'),
      b: crop('b', 'Artigo dois', 'news-2'),
    }
    const combined = combineGroupCropTexts(crops, ['a', 'b'], {
      'news-1': { text: 'Artigo um' } as never,
      'news-2': { text: 'Artigo dois' } as never,
    })
    expect(combined.a?.text).toBe('Artigo um\n\nArtigo dois')
  })
})
