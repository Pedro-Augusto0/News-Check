import { afterEach, describe, expect, it, vi } from 'vitest'

describe('apiUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('prefixes paths with the configured base URL', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://localhost:44344/')
    vi.stubEnv('DEV', true)
    vi.stubEnv('PROD', false)

    const { apiUrl } = await import('./api-config')

    expect(apiUrl('/printed-clipping/Info4AINews/news/create')).toBe(
      'https://localhost:44344/printed-clipping/Info4AINews/news/create',
    )
  })

  it('uses same-origin paths when base URL is empty', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    vi.stubEnv('DEV', false)
    vi.stubEnv('PROD', true)

    const { apiUrl } = await import('./api-config')

    expect(apiUrl('/printed-clipping/Info4AINews/publications/list')).toBe(
      '/printed-clipping/Info4AINews/publications/list',
    )
  })
})
