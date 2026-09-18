import { describe, expect, it } from 'vitest'
import { shouldAutoRunCreatedNewsOcr } from './should-auto-run-created-news-ocr'

function createdNews(
  overrides: Partial<{
    kind: string
    manual: boolean
    cropIds: string[]
    title: string
    text: string
  }> = {},
) {
  return {
    kind: 'news',
    manual: true,
    cropIds: ['crop-1'],
    title: 'Nova notícia',
    text: '',
    ...overrides,
  }
}

describe('shouldAutoRunCreatedNewsOcr', () => {
  it('runs OCR when a created news with a crop opens details still using the placeholder', () => {
    expect(
      shouldAutoRunCreatedNewsOcr({
        open: true,
        item: createdNews(),
      }),
    ).toBe(true)
  })

  it('does not run for API news or before a crop exists', () => {
    expect(shouldAutoRunCreatedNewsOcr({ open: true, item: createdNews({ manual: false }) })).toBe(
      false,
    )
    expect(shouldAutoRunCreatedNewsOcr({ open: true, item: createdNews({ cropIds: [] }) })).toBe(
      false,
    )
    expect(shouldAutoRunCreatedNewsOcr({ open: false, item: createdNews() })).toBe(false)
  })

  it('does not run again after OCR already filled the content', () => {
    expect(
      shouldAutoRunCreatedNewsOcr({
        open: true,
        item: createdNews({ title: 'Prefeitura anuncia obra', text: 'Texto extraído' }),
      }),
    ).toBe(false)
    expect(
      shouldAutoRunCreatedNewsOcr({
        open: true,
        item: createdNews({ title: 'Nova notícia', text: 'Já tem texto' }),
      }),
    ).toBe(false)
  })
})
