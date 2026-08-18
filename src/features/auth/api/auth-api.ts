import { apiUrl } from '@/features/publication-api/config'
import { PUBLICATIONS_PATH } from '@/features/publication-api/publications/publications-api'

export async function validateAccessToken(token: string): Promise<void> {
  const response = await fetch(apiUrl(PUBLICATIONS_PATH), {
    method: 'GET',
    headers: {
      accept: 'text/plain',
      Authorization: `Bearer ${token}`,
    },
  })

  if (response.ok) return

  if (response.status === 401 || response.status === 403) {
    throw new Error('Token inválido ou expirado')
  }

  throw new Error(`Falha na API (${response.status}): ${PUBLICATIONS_PATH}`)
}
