import { beforeEach, describe, expect, it } from 'vitest'
import { useReviewQueueStore } from './review-queue-store'

const EDITION_ID = 'edition-done-test'
const STORAGE_KEY = `feature-crops.review-queue.v2.${EDITION_ID}`

describe('useReviewQueueStore.seedDoneFromApi', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY)
    useReviewQueueStore.setState({
      editionId: EDITION_ID,
      currentId: null,
      inspectId: null,
      statuses: {},
      savedIds: {},
      clientOnly: false,
      workMode: 'free',
      drawMode: 'off',
      activeCropIndex: 0,
      undoStack: [],
    })
  })

  it('marks done news as approved and saved', () => {
    useReviewQueueStore.getState().seedDoneFromApi(EDITION_ID, ['42', '99'])

    const { statuses, savedIds } = useReviewQueueStore.getState()
    expect(statuses).toEqual({
      'news:42': 'approved',
      'news:99': 'approved',
    })
    expect(savedIds).toEqual({
      'news:42': true,
      'news:99': true,
    })
  })
})
