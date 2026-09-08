import type { Crop } from '@/features/crops'
import type { VehicleEdition } from '@/features/edition-session/model'
import type { StoredNewsItem } from '@/features/news'
import type { PageData } from '@/features/page-navigation'
import type { ReviewQueueItem } from '@/features/review-queue/model'
import { createNews } from '@/features/publication-api/news/create-news-api'
import { buildCreateNewsRequest } from '@/features/publication-api/news/create-news-request'

export async function saveApprovedNews(input: {
  item: ReviewQueueItem
  crops: Record<string, Crop>
  newsItems: Record<string, StoredNewsItem>
  edition: VehicleEdition
  pages: PageData[]
}): Promise<boolean> {
  const request = buildCreateNewsRequest(input)
  if (!request) return false
  await createNews(request)
  return true
}
