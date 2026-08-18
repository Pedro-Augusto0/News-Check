import { loadNewsForEdition } from '@/features/publication-api/news/news-api'
import { useNewsStore } from '@/features/news'
import { useSessionStore } from '../store'
import type { VehicleEdition } from '../model'
import { seedCropsFromApiCoordinates } from './seed-api-crops'

let newsRequestSeq = 0

/** Carrega notícias da API, páginas-imagem e cortes a partir de coordinates. */
export async function hydrateEditionNews(edition: VehicleEdition): Promise<void> {
  const requestId = ++newsRequestSeq
  const { hydrateFromApiItems, setLoadingNews } = useNewsStore.getState()
  const { updateEditionPages } = useSessionStore.getState()

  setLoadingNews(true)
  try {
    const { items, pages, cropSeeds } = await loadNewsForEdition(edition)
    if (requestId !== newsRequestSeq) return

    updateEditionPages(edition.id, pages)
    hydrateFromApiItems(edition, items)
    await seedCropsFromApiCoordinates(edition, cropSeeds)
    if (requestId !== newsRequestSeq) return

    setLoadingNews(false)
  } catch (error) {
    if (requestId !== newsRequestSeq) return
    setLoadingNews(false)
    throw error
  }
}
