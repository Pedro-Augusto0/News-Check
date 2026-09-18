import { describe, expect, it } from 'vitest'
import type { PageData } from '@/features/page-navigation'
import { pageOccurrenceKey, UNSECTIONED_LABEL } from '@/features/page-navigation/page-key'
import type { ReviewQueueItem } from '../model'
import { buildReviewPageStats } from './build-review-page-stats'

function page(pageNumber: string, section?: string): PageData {
  const label = section ?? UNSECTIONED_LABEL
  return {
    id: pageOccurrenceKey(pageNumber, label),
    pageNumber,
    section: label,
    imageUrl: '',
    hasClient: false,
    keywordsFound: [],
    keywordsMissing: [],
    keywordOccurrences: [],
    crops: [],
  }
}

function item(
  id: string,
  pageNumber: string,
  overrides: Partial<ReviewQueueItem> = {},
): ReviewQueueItem {
  return {
    id,
    kind: 'news',
    editionId: 'e1',
    pdfId: 'p1',
    pageNumber,
    newsId: id,
    cropIds: [],
    title: id,
    text: '',
    clientKeywords: [],
    customerNames: [],
    clientMatches: [],
    hasClient: false,
    suspectReasons: [],
    sortY: 0,
    previewRect: null,
    ...overrides,
  }
}

describe('buildReviewPageStats', () => {
  it('creates one rail row per page and section pair', () => {
    const stats = buildReviewPageStats({
      pages: [
        { ...page('3', 'Esportes'), filePath: '/Esportes/3.png' },
        { ...page('3', 'Gastronomia'), filePath: '/Gastronomia/3.png' },
      ],
      statuses: {},
      queue: [
        item('sport', '3', { section: 'Esportes' }),
        item('food', '3', { section: 'Gastronomia', hasClient: true }),
      ],
    })

    expect(stats.map((entry) => [entry.pageNumber, entry.section, entry.itemCount])).toEqual([
      ['3', 'Esportes', 1],
      ['3', 'Gastronomia', 1],
    ])
    expect(stats[1]?.clientNewsCount).toBe(1)
  })

  it('keeps A2 with a section separate from A2 without one', () => {
    const stats = buildReviewPageStats({
      pages: [page('A2', 'Colunas'), page('A2')],
      statuses: {},
      queue: [item('column', 'A2', { section: 'Colunas' }), item('plain', 'A2')],
    })

    expect(stats.map((entry) => [entry.pageNumber, entry.section])).toEqual([
      ['A2', 'Colunas'],
      ['A2', UNSECTIONED_LABEL],
    ])
  })

  it('does not add a second row from pdf.pages when the number already has news', () => {
    const stats = buildReviewPageStats({
      pages: [page('3', 'Esportes'), page('4')],
      statuses: {},
      queue: [item('sport', '3', { section: 'Esportes' })],
    })

    expect(stats.map((entry) => [entry.pageNumber, entry.section, entry.itemCount])).toEqual([
      ['3', 'Esportes', 1],
      ['4', UNSECTIONED_LABEL, 0],
    ])
  })

  it('groups rail pages by suggestedSection and falls back to section', () => {
    const stats = buildReviewPageStats({
      pages: [page('3', 'Esportes'), page('3', 'Gastronomia')],
      statuses: {},
      queue: [
        item('sport', '3', { suggestedSection: 'Esportes', section: 'Futebol' }),
        item('food', '3', { section: 'Gastronomia' }),
      ],
    })

    expect(stats.map((entry) => [entry.pageNumber, entry.section])).toEqual([
      ['3', 'Esportes'],
      ['3', 'Gastronomia'],
    ])
  })

  it('merges occurrences with the same file path and uses its page folder', () => {
    const unsectioned = { ...page('6', '-'), filePath: 'https://imagem/-/6.png' }
    const politics = {
      ...page('6', 'POLÍTICA E PODER'),
      filePath: 'https://imagem/-/6.png',
    }

    const stats = buildReviewPageStats({
      pages: [unsectioned, politics],
      statuses: {},
      queue: [
        item('plain', '6', { section: '-' }),
        item('politics', '6', {
          suggestedSection: 'POLÍTICA E PODER',
          section: '-',
          hasClient: true,
        }),
      ],
    })

    expect(stats.map((entry) => [entry.pageNumber, entry.section, entry.itemCount])).toEqual([
      ['6', '-', 2],
    ])
    expect(stats[0]?.clientNewsCount).toBe(1)
  })

  it('marks a page as reviewed only when the backend finished flag is set', () => {
    const pending = buildReviewPageStats({
      pages: [page('3', 'Esportes')],
      statuses: { sport: 'approved' },
      queue: [item('sport', '3', { section: 'Esportes' })],
    })
    expect(pending[0]?.reviewed).toBe(false)

    const finished = buildReviewPageStats({
      pages: [{ ...page('3', 'Esportes'), finished: true, publicationPageId: 9 }],
      statuses: {},
      queue: [item('sport', '3', { section: 'Esportes' })],
    })
    expect(finished[0]).toMatchObject({
      reviewed: true,
      publicationPageId: 9,
      pending: 1,
    })
  })
})
