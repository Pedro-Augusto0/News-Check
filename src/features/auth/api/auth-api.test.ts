import { describe, expect, it, vi, afterEach } from 'vitest'
import { PUBLICATIONS_PATH } from '@/features/publication-api/publications/publications-api'
import { validateAccessToken } from './auth-api'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('validateAccessToken', () => {
  it('validates the token against the publications endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)

    await validateAccessToken('abc123')

    expect(fetchMock).toHaveBeenCalledWith(
      PUBLICATIONS_PATH,
      expect.objectContaining({
        method: 'GET',
        headers: {
          accept: 'text/plain',
          Authorization: 'Bearer abc123',
        },
      }),
    )
  })

  it('rejects invalid tokens', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 401 }),
    )

    await expect(validateAccessToken('bad')).rejects.toThrow('Token inválido ou expirado')
  })
})
