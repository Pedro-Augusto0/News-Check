import type { SessionPayload } from '@/types/session'

const SESSION_URL = '/data/session.json'

export async function loadSession(): Promise<SessionPayload> {
  const response = await fetch(SESSION_URL)
  if (!response.ok) {
    throw new Error(`Falha ao carregar sessão: ${response.status}`)
  }
  const data = (await response.json()) as SessionPayload
  return data
}
