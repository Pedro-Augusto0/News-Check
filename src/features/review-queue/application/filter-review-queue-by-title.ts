import type { ReviewQueueItem } from '../model'

function normalizeTitleQuery(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function filterReviewQueueByTitle(
  items: ReviewQueueItem[],
  search: string,
): ReviewQueueItem[] {
  const query = normalizeTitleQuery(search)
  if (!query) return items
  return items.filter((item) => normalizeTitleQuery(item.title).includes(query))
}
