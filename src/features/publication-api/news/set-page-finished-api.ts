import { apiFetch } from '../http/api-client'

export const SET_PAGE_FINISHED_PATH = '/printed-clipping/Info4AINews/publicationPage/setFineshed'

export async function setPublicationPageFinished(
  publicationPageId: number,
  finished = true,
): Promise<void> {
  const params = new URLSearchParams({
    publicationPageId: String(publicationPageId),
    fineshed: String(finished),
  })
  await apiFetch<unknown>(`${SET_PAGE_FINISHED_PATH}?${params.toString()}`, {
    method: 'POST',
    body: '',
    headers: { accept: 'application/json' },
  })
}
