import { describe, expect, it } from 'vitest'
import type { Crop } from '@/features/crops/model'
import {
  cropBelongsToNews,
  filterCropsByHighlightedNews,
  findCropAtPoint,
  hitTestCropsAtPoint,
  isMultiSelectEvent,
  resolveCropNewsId,
  resolveImageInteraction,
} from './selection'

function crop(id: string, overrides: Partial<Crop> = {}): Crop {
  return {
    id,
    title: id,
    text: '',
    rect: { x: 10, y: 10, width: 20, height: 20 },
    groupId: null,
    finalized: false,
    displayIndex: 1,
    pdfId: 'pdf-1',
    pageNumber: '1',
    editionId: 'edition-1',
    newsItemId: null,
    ...overrides,
  }
}

describe('crop-news selection', () => {
  it('resolves news from crop.newsItemId or the reverse lookup', () => {
    const linked = crop('crop-1', { newsItemId: 'news-1' })
    const reverse = crop('crop-2')
    const findNews = (cropId: string) =>
      cropId === 'crop-2' ? { id: 'news-2' } as never : undefined

    expect(resolveCropNewsId(linked, findNews)).toBe('news-1')
    expect(resolveCropNewsId(reverse, findNews)).toBe('news-2')
    expect(cropBelongsToNews(linked, 'news-1', findNews)).toBe(true)
    expect(cropBelongsToNews(reverse, 'news-2', findNews)).toBe(true)
  })

  it('filters overlay crops by the highlighted news set', () => {
    const crops = [
      crop('a', { newsItemId: 'news-1' }),
      crop('b', { newsItemId: 'news-2' }),
    ]

    expect(filterCropsByHighlightedNews(crops, {}, () => undefined)).toEqual(crops)
    expect(
      filterCropsByHighlightedNews(crops, { 'news-2': true }, () => undefined).map((item) => item.id),
    ).toEqual(['b'])
  })

  it('hits the smallest overlapping crop and treats modifier keys as multi-select', () => {
    const small = crop('small', { rect: { x: 10, y: 10, width: 10, height: 10 } })
    const large = crop('large', { rect: { x: 5, y: 5, width: 40, height: 40 } })

    expect(hitTestCropsAtPoint([large, small], 15, 15, 100, 100)).toEqual({
      kind: 'crop',
      cropId: 'small',
    })
    expect(hitTestCropsAtPoint([small], 15, 15, 100, 100, () => true)).toEqual({
      kind: 'finalized',
    })
    expect(findCropAtPoint([small], 80, 80, 100, 100)).toBeNull()
    expect(isMultiSelectEvent({ ctrlKey: true })).toBe(true)
    expect(isMultiSelectEvent({ metaKey: true })).toBe(true)
    expect(isMultiSelectEvent({})).toBe(false)
  })

  it('draws on pointer-down even over a news crop, and selects only on double-click', () => {
    expect(
      resolveImageInteraction({
        gesture: 'pointerdown',
        isEditing: false,
        panMode: false,
        hitKind: 'crop',
      }),
    ).toBe('draw')
    expect(
      resolveImageInteraction({
        gesture: 'pointerdown',
        isEditing: false,
        panMode: false,
        hitKind: 'miss',
      }),
    ).toBe('draw')
    expect(
      resolveImageInteraction({
        gesture: 'pointerdown',
        isEditing: false,
        panMode: false,
        hitKind: 'finalized',
      }),
    ).toBe('ignore')
    expect(
      resolveImageInteraction({
        gesture: 'pointerdown',
        isEditing: false,
        panMode: true,
        hitKind: 'crop',
      }),
    ).toBe('pan')
    expect(
      resolveImageInteraction({
        gesture: 'dblclick',
        isEditing: false,
        panMode: false,
        hitKind: 'crop',
      }),
    ).toBe('select-news')
    expect(
      resolveImageInteraction({
        gesture: 'dblclick',
        isEditing: false,
        panMode: false,
        hitKind: 'miss',
      }),
    ).toBe('ignore')
    expect(
      resolveImageInteraction({
        gesture: 'dblclick',
        isEditing: true,
        panMode: false,
        hitKind: 'crop',
      }),
    ).toBe('ignore')
  })
})
