import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '../http/api-client'
import { setPublicationFinished } from './set-publication-finished-api'

vi.mock('../http/api-client', () => ({
  apiFetch: vi.fn(),
}))

const mockedApiFetch = vi.mocked(apiFetch)

describe('setPublicationFinished', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('posts publicationId and fineshed=true by default', async () => {
    mockedApiFetch.mockResolvedValue(true)

    await setPublicationFinished(42)

    expect(mockedApiFetch).toHaveBeenCalledWith(
      '/printed-clipping/Info4AINews/publication/setFineshed?publicationId=42&fineshed=true',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('can unmark a publication with fineshed=false', async () => {
    mockedApiFetch.mockResolvedValue(true)

    await setPublicationFinished(42, false)

    expect(mockedApiFetch).toHaveBeenCalledWith(
      '/printed-clipping/Info4AINews/publication/setFineshed?publicationId=42&fineshed=false',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
