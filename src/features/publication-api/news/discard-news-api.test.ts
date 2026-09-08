import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '../http/api-client'
import { discardNews, discardNewsArticles } from './discard-news-api'

vi.mock('../http/api-client', () => ({
  apiFetch: vi.fn(),
}))

const mockedApiFetch = vi.mocked(apiFetch)

describe('discardNews', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('posts articleId as query parameter', async () => {
    mockedApiFetch.mockResolvedValue(true)

    await discardNews(42)

    expect(mockedApiFetch).toHaveBeenCalledWith(
      '/printed-clipping/Info4AINews/news/discard?articleId=42',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('discards each unique article id once', async () => {
    mockedApiFetch.mockResolvedValue(true)

    await discardNewsArticles([42, 99, 42, 0])

    expect(mockedApiFetch).toHaveBeenCalledTimes(2)
  })
})
