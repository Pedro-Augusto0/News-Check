import { describe, expect, it } from 'vitest'
import type { ReviewQueueItem } from '../model'
import { groupReviewQueueByPage, pageGroupTitle } from './group-review-queue-by-page'
import { UNSECTIONED_LABEL } from './group-by-section'

function item(
  id: string,
  pageNumber: string,
  section?: string,
  suggestedSection?: string,
  filePath?: string,
): ReviewQueueItem {
  return {
    id,
    kind: 'news',
    editionId: 'e1',
    pdfId: 'p1',
    pageNumber,
    filePath,
    newsId: id,
    cropIds: [],
    title: id,
    text: '',
    section,
    suggestedSection,
    clientKeywords: [],
    customerNames: [],
    clientMatches: [],
    hasClient: false,
    suspectReasons: [],
    sortY: 0,
    previewRect: null,
  }
}

describe('groupReviewQueueByPage', () => {
  it('groups items by page in natural page order', () => {
    const groups = groupReviewQueueByPage([
      item('b', 'A2'),
      item('a', 'A1'),
      item('c', 'A10'),
      item('d', 'A1'),
    ])

    expect(groups.map((group) => group.pageNumber)).toEqual(['A1', 'A2', 'A10'])
    expect(groups[0]?.items.map((entry) => entry.id)).toEqual(['a', 'd'])
    expect(groups[1]?.items.map((entry) => entry.id)).toEqual(['b'])
  })

  it('keeps the same printed page in different sections as separate groups', () => {
    const groups = groupReviewQueueByPage([
      item('gastro', '3', 'Gastronomia'),
      item('sport-a', '3', 'Esportes'),
      item('sport-b', '3', 'Esportes'),
    ])

    expect(groups.map((group) => [group.pageNumber, group.section])).toEqual([
      ['3', 'Esportes'],
      ['3', 'Gastronomia'],
    ])
    expect(groups[0]?.items.map((entry) => entry.id)).toEqual(['sport-a', 'sport-b'])
    expect(groups[1]?.items.map((entry) => entry.id)).toEqual(['gastro'])
  })

  it('keeps a numbered page with a section apart from the same number without one', () => {
    const groups = groupReviewQueueByPage([
      item('plain', 'A2'),
      item('column', 'A2', 'Colunas'),
    ])

    expect(groups.map((group) => [group.pageNumber, group.section])).toEqual([
      ['A2', 'Colunas'],
      ['A2', UNSECTIONED_LABEL],
    ])
  })

  it('merges the same page when sections only differ by case or accents', () => {
    const groups = groupReviewQueueByPage([
      item('a', '3', 'Política'),
      item('b', '3', 'POLITICA'),
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0]?.section).toBe('Política')
    expect(groups[0]?.items.map((entry) => entry.id)).toEqual(['a', 'b'])
  })

  it('groups the page list by suggestedSection and falls back to section', () => {
    const groups = groupReviewQueueByPage([
      item('sport', '3', 'Futebol', 'Esportes'),
      item('food', '3', 'Gastronomia'),
      item('column', 'A2', 'Opinião', 'Colunas'),
      item('plain', 'A2'),
    ])

    expect(groups.map((group) => [group.pageNumber, group.section])).toEqual([
      ['3', 'Esportes'],
      ['3', 'Gastronomia'],
      ['A2', 'Colunas'],
      ['A2', UNSECTIONED_LABEL],
    ])
  })

  it('uses the file path to separate physical pages and combines only shared files', () => {
    const groups = groupReviewQueueByPage([
      item('cover', '1', '-', 'Capa', 'http://host/jornal/-/1.jpg'),
      item('food', '1', 'DESTEMPERADOS', 'Capa', 'http://host/jornal/DESTEMPERADOS/1.jpg'),
      item('plain', '6', '-', undefined, 'http://host/jornal/-/6.jpg'),
      item('politics', '6', '-', 'POLÍTICA E PODER', 'http://host/jornal/-/6.jpg'),
    ])

    expect(groups.map((group) => [group.pageNumber, group.section, group.items.length])).toEqual([
      ['1', '-', 1],
      ['1', 'DESTEMPERADOS', 1],
      ['6', '-', 2],
    ])
  })

  it('does not expose an internal page id as the visible page number', () => {
    const internalId = '1\0filePath:http://host/jornal/-/1.jpg'
    const groups = groupReviewQueueByPage([item('manual', internalId)])

    expect(groups[0]?.pageNumber).toBe('1')
    expect(pageGroupTitle(groups[0]!, groups)).toBe('Página 1')
  })

  it('returns empty list when there are no items', () => {
    expect(groupReviewQueueByPage([])).toEqual([])
  })
})

describe('pageGroupTitle', () => {
  it('omits the unsectioned label when the page number is unique', () => {
    const groups = groupReviewQueueByPage([item('a', '1')])
    expect(pageGroupTitle(groups[0]!, groups)).toBe('Página 1')
  })

  it('shows the section when the same page number appears twice', () => {
    const groups = groupReviewQueueByPage([
      item('a', '3', 'Esportes'),
      item('b', '3', 'Gastronomia'),
    ])

    expect(groups.map((group) => pageGroupTitle(group, groups))).toEqual([
      'Página 3 · Esportes',
      'Página 3 · Gastronomia',
    ])
  })

  it('shows Sem seção when the duplicate page has no section', () => {
    const groups = groupReviewQueueByPage([item('a', 'A2', 'Colunas'), item('b', 'A2')])
    expect(pageGroupTitle(groups[1]!, groups)).toBe(`Página A2 · ${UNSECTIONED_LABEL}`)
  })
})
