import type { VehicleEdition } from '@/features/edition-session/model'
import type { PublicationDto } from '../dto'
import { apiFetch } from '../http/api-client'
import { mapPublicationToEdition } from './publication-mappers'

export const PUBLICATIONS_PATH = '/printed-clipping/Info4AINews/publications/list'

export async function fetchPublications(): Promise<PublicationDto[]> {
  return apiFetch<PublicationDto[]>(PUBLICATIONS_PATH)
}

export async function loadPublicationEditions(): Promise<VehicleEdition[]> {
  const publications = await fetchPublications()
  return publications.map(mapPublicationToEdition)
}
