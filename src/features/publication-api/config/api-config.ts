/** Base URL da API. Em dev, deixe vazio para usar o proxy do Vite. */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalized}`
}
