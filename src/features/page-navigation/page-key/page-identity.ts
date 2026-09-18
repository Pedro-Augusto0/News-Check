import { comparePageKeys } from './page-key'
import type { PageData } from '../model'

export const UNSECTIONED_LABEL = 'Sem seção'

function normalizeSectionKey(section: string): string {
  const normalized = section
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return normalized || UNSECTIONED_LABEL
}

export function resolveSectionLabel(section: string | undefined): string {
  const trimmed = section?.trim()
  return trimmed || UNSECTIONED_LABEL
}

export function sectionGroupKey(label: string): string {
  if (label === UNSECTIONED_LABEL) return UNSECTIONED_LABEL
  return normalizeSectionKey(label)
}

export function sectionFromPageFilePath(filePath: string | undefined): string | undefined {
  const raw = filePath?.trim()
  if (!raw) return undefined

  let path = raw
  try {
    path = new URL(raw).pathname
  } catch {
    path = raw.split(/[?#]/, 1)[0] ?? raw
  }

  const segments = path.replace(/\\/g, '/').split('/').filter(Boolean)
  const encodedSection = segments.at(-2)
  if (!encodedSection) return undefined

  try {
    return decodeURIComponent(encodedSection).trim() || undefined
  } catch {
    return encodedSection.trim() || undefined
  }
}

/** Page-list grouping: page folder first, then news metadata as fallback. */
export function resolvePageListSection(item: {
  filePath?: string
  suggestedSection?: string
  section?: string
}): string {
  const pageSection = sectionFromPageFilePath(item.filePath)
  if (pageSection) return resolveSectionLabel(pageSection)
  if (item.suggestedSection?.trim()) return resolveSectionLabel(item.suggestedSection)
  return resolveSectionLabel(item.section)
}

/** Identity for a printed page that can exist in more than one section. */
export function pageOccurrenceKey(pageNumber: string, section?: string): string {
  return `${pageNumber}\0${sectionGroupKey(resolveSectionLabel(section))}`
}

export function pageNumberFromPageId(value: string): string {
  const separator = value.indexOf('\0')
  return separator >= 0 ? value.slice(0, separator) : value
}

export function pageIdOf(item: {
  pageNumber: string
  filePath?: string
  suggestedSection?: string
  section?: string
}): string {
  const filePath = item.filePath?.trim()
  if (filePath) return `${item.pageNumber}\0filePath:${filePath}`
  return pageOccurrenceKey(item.pageNumber, resolvePageListSection(item))
}

export function resolvePageId(page: {
  id?: string
  pageNumber: string
  filePath?: string
  section?: string
}): string {
  return page.id ?? pageIdOf(page)
}

export function comparePageOccurrences(
  a: { pageNumber: string; section: string },
  b: { pageNumber: string; section: string },
): number {
  const page = comparePageKeys(a.pageNumber, b.pageNumber)
  if (page !== 0) return page
  if (a.section === UNSECTIONED_LABEL && b.section !== UNSECTIONED_LABEL) return 1
  if (b.section === UNSECTIONED_LABEL && a.section !== UNSECTIONED_LABEL) return -1
  return a.section.localeCompare(b.section, 'pt-BR')
}

export function findPageBySelection(
  pages: PageData[] | undefined,
  selected: string,
): PageData | undefined {
  if (!pages?.length || !selected) return undefined
  return (
    pages.find((page) => resolvePageId(page) === selected) ??
    pages.find((page) => page.pageNumber === selected)
  )
}

export function emptyPageData(pageNumber = '1', section = UNSECTIONED_LABEL): PageData {
  return {
    id: pageOccurrenceKey(pageNumber, section),
    pageNumber,
    section,
    imageUrl: '',
    hasClient: false,
    keywordsFound: [],
    keywordsMissing: [],
    keywordOccurrences: [],
    crops: [],
  }
}
