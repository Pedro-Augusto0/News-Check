import type { Crop, StoredNewsItem } from '@/types/session'

export function buildNewsCountByPage(
  newsItems: Record<string, Pick<StoredNewsItem, 'pdfId' | 'pageNumber'>>,
  pdfId: string,
): Map<number, number> {
  const map = new Map<number, number>()
  for (const item of Object.values(newsItems)) {
    if (item.pdfId !== pdfId) continue
    map.set(item.pageNumber, (map.get(item.pageNumber) ?? 0) + 1)
  }
  return map
}

export function buildCropCountByPage(
  crops: Record<string, { pdfId: string; pageNumber: number }>,
  pdfId: string,
): Map<number, number> {
  const map = new Map<number, number>()
  for (const crop of Object.values(crops)) {
    if (crop.pdfId !== pdfId) continue
    map.set(crop.pageNumber, (map.get(crop.pageNumber) ?? 0) + 1)
  }
  return map
}

export function getUniqueNewsItemsForPage(
  crops: Record<string, Crop>,
  groups: Record<string, { cropIds: string[] }>,
  pdfId: string,
  pageNumber: number,
): Crop[] {
  const pageCrops = Object.values(crops).filter(
    (crop) => crop.pdfId === pdfId && crop.pageNumber === pageNumber,
  )
  const seenGroups = new Set<string>()
  const items: Crop[] = []

  for (const crop of pageCrops) {
    if (crop.groupId && groups[crop.groupId]) {
      if (seenGroups.has(crop.groupId)) continue
      seenGroups.add(crop.groupId)
      items.push(crop)
      continue
    }
    if (!crop.groupId) items.push(crop)
  }

  return items
}
