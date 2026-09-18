import { describe, expect, it } from 'vitest'
import {
  findPageBySelection,
  pageIdOf,
  pageNumberFromPageId,
  pageOccurrenceKey,
  resolvePageId,
  resolvePageListSection,
  sectionFromPageFilePath,
} from './page-identity'
import type { PageData } from '../model'

function page(overrides: Partial<PageData> & Pick<PageData, 'pageNumber'>): PageData {
  return {
    imageUrl: '',
    hasClient: false,
    keywordsFound: [],
    keywordsMissing: [],
    keywordOccurrences: [],
    crops: [],
    ...overrides,
    id: overrides.id ?? pageOccurrenceKey(overrides.pageNumber, overrides.section),
  }
}

describe('page identity', () => {
  it('uses news metadata only when the page path is unavailable', () => {
    expect(resolvePageListSection({ suggestedSection: 'Esportes', section: 'Futebol' })).toBe(
      'Esportes',
    )
    expect(resolvePageListSection({ suggestedSection: '  ', section: 'Gastronomia' })).toBe(
      'Gastronomia',
    )
  })

  it('uses the page folder from filePath as the grouping label', () => {
    const filePath =
      'http://host/scancontrol/Zero%20Hora%20-%20RS/DESTEMPERADOS/1.jpg?token=abc'

    expect(sectionFromPageFilePath(filePath)).toBe('DESTEMPERADOS')
    expect(
      resolvePageListSection({
        filePath,
        suggestedSection: 'Capa',
        section: '-',
      }),
    ).toBe('DESTEMPERADOS')
    expect(resolvePageListSection({ filePath: 'http://host/jornal/-/1.jpg' })).toBe('-')
  })

  it('gives the same printed page different ids per section', () => {
    expect(pageIdOf({ pageNumber: '6', suggestedSection: 'Esportes' })).not.toBe(
      pageIdOf({ pageNumber: '6', suggestedSection: 'Gastronomia' }),
    )
    expect(pageOccurrenceKey('6', 'Esportes')).not.toBe(pageOccurrenceKey('6', 'Gastronomia'))
  })

  it('uses the file path as the physical page identity when available', () => {
    const sharedPath = 'http://host/jornal/-/6.jpg'

    expect(pageIdOf({ pageNumber: '6', filePath: sharedPath, section: '-' })).toBe(
      pageIdOf({ pageNumber: '6', filePath: sharedPath, suggestedSection: 'Política' }),
    )
    expect(pageIdOf({ pageNumber: '1', filePath: 'http://host/jornal/-/1.jpg' })).not.toBe(
      pageIdOf({ pageNumber: '1', filePath: 'http://host/jornal/DESTEMPERADOS/1.jpg' }),
    )
  })

  it('extracts the visible page number from an internal page id', () => {
    const pageId = pageIdOf({
      pageNumber: '1',
      filePath: 'http://host/jornal/-/1.jpg',
    })

    expect(pageNumberFromPageId(pageId)).toBe('1')
    expect(pageNumberFromPageId('A2')).toBe('A2')
  })

  it('finds a page by unique id even when the printed number repeats', () => {
    const pages = [
      page({ pageNumber: '6', section: 'Esportes', imageUrl: '/esportes.jpg' }),
      page({ pageNumber: '6', section: 'Gastronomia', imageUrl: '/gastro.jpg' }),
    ]

    expect(findPageBySelection(pages, resolvePageId(pages[1]!))?.imageUrl).toBe('/gastro.jpg')
    expect(findPageBySelection(pages, '6')?.imageUrl).toBe('/esportes.jpg')
  })
})
