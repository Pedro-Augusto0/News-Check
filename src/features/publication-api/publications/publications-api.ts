import type { VehicleEdition } from '@/features/edition-session/model'
import type { PublicationDto } from '../dto'
import { apiFetch } from '../http/api-client'
import { mapPublicationToEdition } from './publication-mappers'

export const PUBLICATIONS_PATH = '/printed-clipping/Info4AINews/publications/list'

let inflightPublications: Promise<PublicationDto[]> | null = null

export async function fetchPublications(): Promise<PublicationDto[]> {
  if (inflightPublications) return inflightPublications

  const promise = apiFetch<PublicationDto[]>(PUBLICATIONS_PATH)
  inflightPublications = promise
  try {
    return await promise
  } finally {
    if (inflightPublications === promise) {
      inflightPublications = null
    }
  }
}

export async function loadPublicationEditions(): Promise<VehicleEdition[]> {
  const publications = await fetchPublications()
  return publications.map(mapPublicationToEdition)
}
