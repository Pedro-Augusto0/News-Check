import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/features/auth/store'
import { apiFetch } from './api-client'

afterEach(() => {
  useAuthStore.getState().clearToken()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('apiFetch', () => {
  it('attaches the stored token as Authorization Bearer', async () => {
    useAuthStore.getState().setToken('stored-token')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 1 }],
    })
    vi.stubGlobal('fetch', fetchMock)

    await apiFetch('/printed-clipping/Info4AINews/publications/list')

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers
    expect(headers.get('Authorization')).toBe('Bearer stored-token')
  })
})
