import { describe, expect, it } from 'vitest'
import { normalizeOcrText } from './text-extractor'

describe('normalizeOcrText', () => {
  it('joins words split by OCR line-break hyphenation', () => {
    expect(normalizeOcrText('publica- mente')).toBe('publicamente')
    expect(normalizeOcrText('informa-\nção')).toBe('informação')
  })

  it('preserves hyphens without trailing whitespace', () => {
    expect(normalizeOcrText('segunda-feira')).toBe('segunda-feira')
  })
})
