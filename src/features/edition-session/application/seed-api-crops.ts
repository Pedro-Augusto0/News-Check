import type { VehicleEdition } from '../model'
import type { ApiNewsCropSeed } from '@/features/publication-api/news/news-mappers'
import { useCropsStore } from '@/features/crops'
import { useNewsStore } from '@/features/news'
import { apiCropIdForNews, parseApiCoordinates } from '@/features/crops/api-coordinates'

/** Recria cortes a partir de `coordinates` (lista, escala 0–1000) e vincula às notícias. */
export async function seedCropsFromApiCoordinates(
  edition: VehicleEdition,
  seeds: ApiNewsCropSeed[],
): Promise<void> {
  const pdfId = edition.pdfs[0]?.id
  if (!pdfId) return

  // Descarta seeds antigos (pixel / v1) para não manter retângulo errado no localStorage.
  useCropsStore.getState().removeApiSeededCrops(edition.id)

  if (seeds.length === 0) return

  const { upsertApiCrop, mergeCrops } = useCropsStore.getState()
  const { linkCropToNews, getNewsItem } = useNewsStore.getState()
  const firstCropIdByNews = new Map<string, string>()

  for (const seed of seeds) {
    const news = getNewsItem(seed.newsId)
    if (!news || news.manual) continue

    const rect = parseApiCoordinates(seed.coordinates)
    if (!rect) continue

    const hasFirst = firstCropIdByNews.has(seed.newsId)
    const cropId = apiCropIdForNews(seed.newsId, seed.index)
    upsertApiCrop({
      id: cropId,
      editionId: edition.id,
      pdfId,
      pageNumber: seed.pageNumber,
      rect,
      title: seed.title,
      text: hasFirst ? '' : seed.text,
      newsItemId: seed.newsId,
      clientKeywordsFound: seed.clientKeywordsFound,
    })

    const firstCropId = firstCropIdByNews.get(seed.newsId)
    if (firstCropId) {
      mergeCrops(cropId, firstCropId)
      continue
    }

    linkCropToNews(seed.newsId, cropId)
    firstCropIdByNews.set(seed.newsId, cropId)
  }
}
