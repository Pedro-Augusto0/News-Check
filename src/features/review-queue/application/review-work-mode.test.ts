import { describe, expect, it } from 'vitest'
import { resolveReviewItemClick } from './review-work-mode'

describe('resolveReviewItemClick', () => {
  it('activates any news in free mode', () => {
    expect(resolveReviewItemClick('free', 'a', 'b')).toBe('activate')
    expect(resolveReviewItemClick('free', 'a', 'a')).toBe('activate')
  })

  it('keeps the current news in focus mode and only previews others', () => {
    expect(resolveReviewItemClick('focus', 'a', 'a')).toBe('activate')
    expect(resolveReviewItemClick('focus', 'a', 'b')).toBe('preview')
    expect(resolveReviewItemClick('focus', null, 'b')).toBe('preview')
  })
})
