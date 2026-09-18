import { describe, expect, it } from 'vitest'
import {
  isCreationSessionLocked,
  shouldConfirmDiscardCreationDraft,
} from './creation-draft-guard'

describe('isCreationSessionLocked', () => {
  it('unlocks the session once the new news has a crop', () => {
    expect(isCreationSessionLocked({ cropId: 'crop-1' })).toBe(false)
    expect(isCreationSessionLocked({ cropId: null })).toBe(true)
    expect(isCreationSessionLocked(null)).toBe(false)
  })
})

describe('shouldConfirmDiscardCreationDraft', () => {
  it('does not ask to discard when closing the details modal of a draft', () => {
    expect(
      shouldConfirmDiscardCreationDraft({
        reason: 'close-details',
        isCreationDraft: true,
      }),
    ).toBe(false)
  })

  it('asks to discard when the queue discard action targets the draft', () => {
    expect(
      shouldConfirmDiscardCreationDraft({
        reason: 'discard-item',
        isCreationDraft: true,
      }),
    ).toBe(true)
  })

  it('asks to discard when cancelling draw mode before a crop exists', () => {
    expect(
      shouldConfirmDiscardCreationDraft({
        reason: 'cancel-incomplete-draw',
        isCreationDraft: true,
        hasCrop: false,
      }),
    ).toBe(true)
  })

  it('lets draw mode turn off after a crop exists', () => {
    expect(
      shouldConfirmDiscardCreationDraft({
        reason: 'cancel-incomplete-draw',
        isCreationDraft: true,
        hasCrop: true,
      }),
    ).toBe(false)
  })

  it('never confirms when the target is not a creation draft', () => {
    expect(
      shouldConfirmDiscardCreationDraft({
        reason: 'discard-item',
        isCreationDraft: false,
      }),
    ).toBe(false)
    expect(
      shouldConfirmDiscardCreationDraft({
        reason: 'close-details',
        isCreationDraft: false,
      }),
    ).toBe(false)
  })
})
