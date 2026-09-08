import { describe, expect, it } from 'vitest'
import { resolveReviewShortcut } from './resolve-review-shortcut'

function event(
  key: string,
  extras: Partial<{
    ctrlKey: boolean
    metaKey: boolean
    altKey: boolean
    typing: boolean
    detailsOpen: boolean
  }> = {},
) {
  return {
    key,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    typing: false,
    detailsOpen: false,
    ...extras,
  }
}

describe('resolveReviewShortcut', () => {
  it('approves with Ctrl+S or Cmd+S, not with Space', () => {
    expect(resolveReviewShortcut(event('s', { ctrlKey: true }))).toBe('approve')
    expect(resolveReviewShortcut(event('S', { metaKey: true }))).toBe('approve')
    expect(resolveReviewShortcut(event(' '))).toBeNull()
  })

  it('opens details with F2, not with T', () => {
    expect(resolveReviewShortcut(event('F2'))).toBe('openDetails')
    expect(resolveReviewShortcut(event('t'))).toBeNull()
    expect(resolveReviewShortcut(event('T'))).toBeNull()
  })

  it('still approves with Enter when not typing', () => {
    expect(resolveReviewShortcut(event('Enter'))).toBe('approve')
    expect(resolveReviewShortcut(event('Enter', { typing: true }))).toBeNull()
  })

  it('blocks the browser save dialog while the details modal is open', () => {
    expect(resolveReviewShortcut(event('s', { ctrlKey: true, detailsOpen: true }))).toBe(
      'preventBrowserSave',
    )
    expect(resolveReviewShortcut(event('s', { ctrlKey: true, typing: true, detailsOpen: true }))).toBe(
      'preventBrowserSave',
    )
  })

  it('ignores letter shortcuts while typing', () => {
    expect(resolveReviewShortcut(event('n', { typing: true }))).toBeNull()
    expect(resolveReviewShortcut(event('F2', { typing: true }))).toBeNull()
  })
})
