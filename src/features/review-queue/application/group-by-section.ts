import { normalizeKeyword } from './highlight-keywords'

export const UNSECTIONED_LABEL = 'Sem seção'

export interface SectionGroup<T> {
  section: string
  items: T[]
}

export function normalizeSectionKey(section: string): string {
  const normalized = normalizeKeyword(section)
  return normalized || UNSECTIONED_LABEL
}

export function resolveSectionLabel(section: string | undefined): string {
  const trimmed = section?.trim()
  return trimmed || UNSECTIONED_LABEL
}

function sectionGroupKey(label: string): string {
  if (label === UNSECTIONED_LABEL) return UNSECTIONED_LABEL
  return normalizeSectionKey(label)
}

/** Picks the most common named section; falls back to "Sem seção". */
export function resolvePageSection(sections: Array<string | undefined>): string {
  const counts = new Map<string, { label: string; count: number }>()
  for (const section of sections) {
    const label = resolveSectionLabel(section)
    const key = sectionGroupKey(label)
    const existing = counts.get(key)
    if (existing) {
      existing.count += 1
      continue
    }
    counts.set(key, { label, count: 1 })
  }

  let best = UNSECTIONED_LABEL
  let bestCount = 0
  for (const [key, entry] of counts) {
    if (key === UNSECTIONED_LABEL) continue
    if (entry.count > bestCount) {
      best = entry.label
      bestCount = entry.count
    }
  }
  return bestCount > 0 ? best : UNSECTIONED_LABEL
}

export function groupBySection<T>(
  items: T[],
  getSection: (item: T) => string | undefined,
): SectionGroup<T>[] {
  const map = new Map<string, T[]>()
  const displayByKey = new Map<string, string>()
  const order: string[] = []

  for (const item of items) {
    const label = resolveSectionLabel(getSection(item))
    const key = sectionGroupKey(label)
    const existing = map.get(key)
    if (existing) {
      existing.push(item)
      continue
    }
    map.set(key, [item])
    displayByKey.set(key, label)
    order.push(key)
  }

  const named = order.filter((key) => key !== UNSECTIONED_LABEL)
  if (order.includes(UNSECTIONED_LABEL)) named.push(UNSECTIONED_LABEL)

  return named.map((key) => ({
    section: displayByKey.get(key) ?? key,
    items: map.get(key) ?? [],
  }))
}
