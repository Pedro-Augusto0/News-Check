import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '../http/api-client'
import { setPublicationPageFinished } from './set-page-finished-api'

vi.mock('../http/api-client', () => ({
  apiFetch: vi.fn(),
}))

const mockedApiFetch = vi.mocked(apiFetch)

describe('setPublicationPageFinished', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('posts publicationPageId and fineshed=true by default', async () => {
    mockedApiFetch.mockResolvedValue(true)

    await setPublicationPageFinished(88)

    expect(mockedApiFetch).toHaveBeenCalledWith(
      '/printed-clipping/Info4AINews/publicationPage/setFineshed?publicationPageId=88&fineshed=true',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('can unmark a page with fineshed=false', async () => {
    mockedApiFetch.mockResolvedValue(true)

    await setPublicationPageFinished(88, false)

    expect(mockedApiFetch).toHaveBeenCalledWith(
      '/printed-clipping/Info4AINews/publicationPage/setFineshed?publicationPageId=88&fineshed=false',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
