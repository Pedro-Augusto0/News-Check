const DEV_API_BASE_URL = 'https://localhost:44344'

function normalizeBaseUrl(value: string | undefined): string {
  return value?.trim().replace(/\/+$/, '') ?? ''
}

function resolveApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL as string | undefined
  if (fromEnv !== undefined && fromEnv.trim() !== '') {
    return normalizeBaseUrl(fromEnv)
  }
  if (import.meta.env.DEV) return DEV_API_BASE_URL
  return ''
}

/** Dev: localhost:44344. Prod: mesma origem (proxy Netlify → prd-api.cservice.io). */
export const API_BASE_URL = resolveApiBaseUrl()

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (!API_BASE_URL) return normalized
  return `${API_BASE_URL}${normalized}`
}
