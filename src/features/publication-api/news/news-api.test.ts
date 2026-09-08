import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '../http/api-client'
import { fetchNewsByPublication } from './news-api'

vi.mock('../http/api-client', () => ({
  apiFetch: vi.fn(),
}))

const mockedApiFetch = vi.mocked(apiFetch)

describe('fetchNewsByPublication', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('deduplicates concurrent requests for the same publication', async () => {
    let resolveFetch!: (value: unknown[]) => void
    mockedApiFetch.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve
      }),
    )

    const first = fetchNewsByPublication('Gazeta', '2026-08-18')
    const second = fetchNewsByPublication('Gazeta', '2026-08-18')

    resolveFetch([{ id: 1 }])
    const [one, two] = await Promise.all([first, second])

    expect(mockedApiFetch).toHaveBeenCalledTimes(1)
    expect(one).toEqual([{ id: 1 }])
    expect(two).toEqual([{ id: 1 }])
  })
})
