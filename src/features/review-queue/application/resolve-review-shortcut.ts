export type ReviewShortcutAction =
  | 'approve'
  | 'reject'
  | 'next'
  | 'prev'
  | 'undo'
  | 'toggleClientOnly'
  | 'toggleRedraw'
  | 'attachInspected'
  | 'cycleCrop'
  | 'mergeSuggested'
  | 'splitActive'
  | 'addSegment'
  | 'openDetails'
  | 'closeDetails'
  | 'clearOrCancel'
  | 'preventBrowserSave'

export interface ReviewShortcutInput {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  shiftKey: boolean
  typing: boolean
  detailsOpen: boolean
}

export function resolveReviewShortcut(input: ReviewShortcutInput): ReviewShortcutAction | null {
  const modifier = input.ctrlKey || input.metaKey
  const saveCombo =
    modifier && input.key.toLowerCase() === 's' && !input.altKey && !input.shiftKey
  const addSegmentCombo =
    modifier && input.key.toLowerCase() === 'q' && !input.altKey && !input.shiftKey

  if (saveCombo) {
    return input.detailsOpen ? 'preventBrowserSave' : 'approve'
  }

  if (addSegmentCombo) {
    return input.typing || input.detailsOpen ? null : 'addSegment'
  }

  if (input.typing) return null
  if (modifier || input.altKey) return null

  if (input.detailsOpen) {
    return input.key === 'Escape' ? 'closeDetails' : null
  }

  switch (input.key) {
    case 'Enter':
      return 'approve'
    case 'n':
    case 'N':
      return 'reject'
    case 'j':
    case 'J':
    case 'ArrowDown':
      return 'next'
    case 'k':
    case 'K':
    case 'ArrowUp':
      return 'prev'
    case 'u':
    case 'U':
      return 'undo'
    case 'c':
    case 'C':
      return 'toggleClientOnly'
    case 'r':
    case 'R':
      return 'toggleRedraw'
    case 'a':
    case 'A':
      return 'attachInspected'
    case ']':
      return 'cycleCrop'
    case 'm':
    case 'M':
      return 'mergeSuggested'
    case 'x':
    case 'X':
      return 'splitActive'
    case 'F2':
      return 'openDetails'
    case 'Escape':
      return 'clearOrCancel'
    default:
      return null
  }
}
