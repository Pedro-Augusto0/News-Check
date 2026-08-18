const AUTH_TOKEN_KEY = 'cservice.accessToken'

export function readStoredAccessToken(): string | null {
  try {
    return sessionStorage.getItem(AUTH_TOKEN_KEY)
  } catch {
    return null
  }
}

export function persistAccessToken(token: string): void {
  sessionStorage.setItem(AUTH_TOKEN_KEY, token)
}

export function clearStoredAccessToken(): void {
  sessionStorage.removeItem(AUTH_TOKEN_KEY)
}
