import type { VehicleEdition } from '@/types/session'
import { loadNewsForEdition } from '@/services/api/news'
import { seedCropsFromApiCoordinates } from '@/services/seedCropsFromApi'
import { useNewsStore } from '@/stores/newsStore'
import { useSessionStore } from '@/stores/sessionStore'

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
