import { loadNewsForEdition } from '@/features/publication-api/news/news-api'
import { useNewsStore } from '@/features/news'
import { useReviewQueueStore } from '@/features/review-queue/store'
import { useSessionStore } from '../store'
import type { VehicleEdition } from '../model'
import { seedCropsFromApiCoordinates } from './seed-api-crops'

let newsRequestSeq = 0
const inflightHydrations = new Map<string, Promise<void>>()

async function hydrateEditionNewsInternal(edition: VehicleEdition): Promise<void> {
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

    const doneNewsIds = items.filter((item) => item.done).map((item) => item.id)
    useReviewQueueStore.getState().seedDoneFromApi(edition.id, doneNewsIds)

    setLoadingNews(false)
  } catch (error) {
    if (requestId !== newsRequestSeq) return
    setLoadingNews(false)
    throw error
  }
}

/** Carrega notícias da API, páginas-imagem e cortes a partir da lista de coordinates. */
export async function hydrateEditionNews(edition: VehicleEdition): Promise<void> {
  const key = edition.id
  const inflight = inflightHydrations.get(key)
  if (inflight) return inflight

  const promise = hydrateEditionNewsInternal(edition)
  inflightHydrations.set(key, promise)
  try {
    await promise
  } finally {
    if (inflightHydrations.get(key) === promise) {
      inflightHydrations.delete(key)
    }
  }
}
