import { apiUrl } from '../config/api-config'
import { useAuthStore } from '@/features/auth/store'

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (!headers.has('accept')) {
    headers.set('accept', 'text/plain')
  }

  const token = useAuthStore.getState().token
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(apiUrl(path), {
    ...init,
    headers,
  })

  if (!response.ok) {
    throw new Error(`Falha na API (${response.status}): ${path}`)
  }

  return (await response.json()) as T
}
