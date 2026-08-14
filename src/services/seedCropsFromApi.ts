import type { VehicleEdition } from '@/types/session'
import type { ApiNewsCropSeed } from '@/services/api/news'
import { apiCropIdForNews, parseApiCoordinates } from '@/utils/apiCoordinates'
import { useCropsStore } from '@/stores/cropsStore'
import { useNewsStore } from '@/stores/newsStore'

/** Recria cortes a partir de `coordinates` (escala 0–1000) e vincula às notícias. */
export async function seedCropsFromApiCoordinates(
  edition: VehicleEdition,
  seeds: ApiNewsCropSeed[],
): Promise<void> {
  const pdfId = edition.pdfs[0]?.id
  if (!pdfId) return

  // Descarta seeds antigos (pixel / v1) para não manter retângulo errado no localStorage.
  useCropsStore.getState().removeApiSeededCrops(edition.id)

  if (seeds.length === 0) return

  const { upsertApiCrop } = useCropsStore.getState()
  const { linkCropToNews, getNewsItem } = useNewsStore.getState()

  for (const seed of seeds) {
    const news = getNewsItem(seed.newsId)
    if (!news || news.manual) continue

    const rect = parseApiCoordinates(seed.coordinates)
    if (!rect) continue

    const cropId = apiCropIdForNews(seed.newsId)
    upsertApiCrop({
      id: cropId,
      editionId: edition.id,
      pdfId,
      pageNumber: seed.pageNumber,
      rect,
      title: seed.title,
      text: seed.text,
      newsItemId: seed.newsId,
      clientKeywordsFound: seed.clientKeywordsFound,
    })
    linkCropToNews(seed.newsId, cropId)
  }
}
