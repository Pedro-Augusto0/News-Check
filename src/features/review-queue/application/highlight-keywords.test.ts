import { describe, expect, it } from 'vitest'
import { highlightKeywordSegments } from './highlight-keywords'

describe('highlightKeywordSegments', () => {
  it('marks keywords without regard to case or accents', () => {
    const segments = highlightKeywordSegments(
      'A Igreja Presbiteriana Unidade reconheceu São Paulo.',
      ['igreja', 'sao paulo'],
    )
    const marked = segments.filter((segment) => segment.matched).map((segment) => segment.text)
    expect(marked).toEqual(['Igreja', 'São Paulo'])
  })

  it('prefers the longest keyword when terms overlap', () => {
    const marked = highlightKeywordSegments('São Paulo venceu', ['São', 'São Paulo'])
      .filter((segment) => segment.matched)
      .map((segment) => segment.text)
    expect(marked).toEqual(['São Paulo'])
  })

  it('returns the original text when there are no usable keywords', () => {
    expect(highlightKeywordSegments('Texto livre', [])).toEqual([
      { text: 'Texto livre', matched: false },
    ])
  })
})
