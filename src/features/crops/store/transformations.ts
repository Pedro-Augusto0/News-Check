import type { Crop } from '../model'
import type { StoredNewsItem } from '@/features/news'

export function concatUniqueTexts(values: Array<string | undefined | null>): string {
  const parts: string[] = []
  const seen = new Set<string>()
  for (const value of values) {
    const text = value?.trim()
    if (!text || seen.has(text)) continue
    seen.add(text)
    parts.push(text)
  }
  return parts.join('\n\n')
}

export function combineGroupCropTexts(
  crops: Record<string, Crop>,
  cropIds: string[],
  newsItems?: Record<string, StoredNewsItem>,
): Record<string, Crop> {
  const values: Array<string | undefined> = []
  const seenNews = new Set<string>()

  for (const id of cropIds) {
    const crop = crops[id]
    if (!crop) continue
    values.push(crop.text)
    if (!newsItems || !crop.newsItemId || seenNews.has(crop.newsItemId)) continue
    seenNews.add(crop.newsItemId)
    values.push(newsItems[crop.newsItemId]?.text)
  }

  const combined = concatUniqueTexts(values)
  if (!combined) return crops
  const next = { ...crops }
  const [firstId, ...restIds] = cropIds
  if (firstId && next[firstId]) next[firstId] = { ...next[firstId], text: combined }
  for (const id of restIds) {
    if (next[id]) next[id] = { ...next[id], text: '' }
  }
  return next
}
