import { apiFetch } from '../http/api-client'

export const SET_PUBLICATION_FINISHED_PATH = '/printed-clipping/Info4AINews/publication/setFineshed'

export async function setPublicationFinished(
  publicationId: number,
  finished = true,
): Promise<void> {
  const params = new URLSearchParams({
    publicationId: String(publicationId),
    fineshed: String(finished),
  })
  await apiFetch<unknown>(`${SET_PUBLICATION_FINISHED_PATH}?${params.toString()}`, {
    method: 'POST',
    body: '',
    headers: { accept: 'application/json' },
  })
}
