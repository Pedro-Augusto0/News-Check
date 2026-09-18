import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Crop } from '@/features/crops'
import { useCropsStore } from '@/features/crops'
import { useNewsStore } from '@/features/news'
import type { StoredNewsItem } from '@/features/news'
import { extractCropContent } from './text-extractor'
import { extractAndReplaceNewsContent } from './crop-text-extraction'

vi.mock('./text-extractor', async () => {
  const actual = await vi.importActual<typeof import('./text-extractor')>('./text-extractor')
  return {
    ...actual,
    extractCropContent: vi.fn(),
  }
})

const mockedExtract = vi.mocked(extractCropContent)

function crop(id: string, y: number, overrides: Partial<Crop> = {}): Crop {
  return {
    id,
    editionId: 'edition-1',
    pdfId: 'pdf-1',
    pageNumber: '1',
    rect: { x: 0, y, width: 20, height: 20 },
    title: 'Título da API',
    text: 'Texto antigo da API',
    groupId: null,
    finalized: false,
    displayIndex: 1,
    newsItemId: 'news-1',
    ...overrides,
  }
}

function newsItem(overrides: Partial<StoredNewsItem> = {}): StoredNewsItem {
  return {
    id: 'news-1',
    title: 'Título da API',
    text: 'Texto antigo da API',
    cropId: 'crop-a',
    pdfId: 'pdf-1',
    pageNumber: '1',
    editionId: 'edition-1',
    ...overrides,
  }
}

describe('extractAndReplaceNewsContent', () => {
  beforeEach(() => {
    mockedExtract.mockReset()
    useCropsStore.setState({
      crops: {
        'crop-a': crop('crop-a', 10),
        'crop-b': crop('crop-b', 80, { title: 'Outro título', text: 'Outro texto' }),
      },
    })
    useNewsStore.setState({
      items: { 'news-1': newsItem() },
    })
  })

  it('overwrites existing API title and text when the user asks to run OCR', async () => {
    mockedExtract.mockResolvedValue({ title: 'Título lido', text: 'Texto lido do recorte' })

    const result = await extractAndReplaceNewsContent(
      [useCropsStore.getState().crops['crop-a']!],
      () => 'https://img/page.png',
    )

    expect(result).toEqual({ title: 'Título lido', text: 'Texto lido do recorte' })
    expect(useNewsStore.getState().items['news-1']).toMatchObject({
      title: 'Título lido',
      text: 'Texto lido do recorte',
    })
    expect(useCropsStore.getState().crops['crop-a']).toMatchObject({
      title: 'Título lido',
      text: 'Texto lido do recorte',
    })
  })

  it('combines every crop in reading order so extra areas are OCR’d together', async () => {
    mockedExtract
      .mockResolvedValueOnce({ title: 'Primeiro', text: 'Parágrafo 1' })
      .mockResolvedValueOnce({ title: '', text: 'Parágrafo 2' })

    const result = await extractAndReplaceNewsContent(
      [useCropsStore.getState().crops['crop-b']!, useCropsStore.getState().crops['crop-a']!],
      () => 'https://img/page.png',
    )

    expect(result.text).toBe('Parágrafo 1\n\nParágrafo 2')
    expect(result.title).toBe('Primeiro')
    expect(useNewsStore.getState().items['news-1']?.text).toBe('Parágrafo 1\n\nParágrafo 2')
  })

  it('keeps the current text when OCR returns nothing', async () => {
    mockedExtract.mockResolvedValue({ title: '', text: '' })

    await expect(
      extractAndReplaceNewsContent(
        [useCropsStore.getState().crops['crop-a']!],
        () => 'https://img/page.png',
      ),
    ).rejects.toThrow('Não foi possível ler o texto dos recortes')

    expect(useNewsStore.getState().items['news-1']).toMatchObject({
      title: 'Título da API',
      text: 'Texto antigo da API',
    })
  })
})
