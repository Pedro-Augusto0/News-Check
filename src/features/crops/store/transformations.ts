import type { Crop } from '../model'
import type { StoredNewsItem } from '@/features/news'

export function combineGroupCropTexts(
  crops: Record<string, Crop>,
  cropIds: string[],
  newsItems?: Record<string, StoredNewsItem>,
): Record<string, Crop> {
  const parts: string[] = []
  const seenNews = new Set<string>()
  const seenText = new Set<string>()

  for (const id of cropIds) {
    const crop = crops[id]
    if (!crop) continue
    const cropText = crop.text.trim()
    if (cropText) {
      if (!seenText.has(cropText)) {
        parts.push(cropText)
        seenText.add(cropText)
      }
      if (crop.newsItemId) seenNews.add(crop.newsItemId)
      continue
    }
    if (!newsItems || !crop.newsItemId || seenNews.has(crop.newsItemId)) continue
    seenNews.add(crop.newsItemId)
    const newsText = newsItems[crop.newsItemId]?.text?.trim()
    if (newsText && !seenText.has(newsText)) {
      parts.push(newsText)
      seenText.add(newsText)
    }
  }

  const combined = parts.join('\n\n')
  if (!combined) return crops
  const next = { ...crops }
  const [firstId, ...restIds] = cropIds
  if (firstId && next[firstId]) next[firstId] = { ...next[firstId], text: combined }
  for (const id of restIds) {
    if (next[id]) next[id] = { ...next[id], text: '' }
  }
  return next
}
