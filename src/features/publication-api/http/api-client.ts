import { apiUrl } from '../config/api-config'

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      accept: 'text/plain',
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    throw new Error(`Falha na API (${response.status}): ${path}`)
  }

  return (await response.json()) as T
}
