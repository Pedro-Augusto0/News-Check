import { useEffect, useRef } from 'react'
import { resolveReviewShortcut } from '../application'
import type { ReviewDrawMode } from '../model'

export interface ReviewKeyboardActions {
  approve: () => void
  reject: () => void
  next: () => void
  prev: () => void
  undo: () => void
  toggleClientOnly: () => void
  setDrawMode: (mode: ReviewDrawMode) => void
  drawMode: ReviewDrawMode
  cycleCrop: () => void
  mergeSuggested: () => void
  attachInspected: () => void
  clearInspect: () => void
  splitActive: () => void
  addSegment: () => void
  openDetails: () => void
  closeDetails: () => void
  detailsOpen: boolean
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

export function useReviewKeyboard(actions: ReviewKeyboardActions) {
  const actionsRef = useRef(actions)
  actionsRef.current = actions

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const current = actionsRef.current
      const action = resolveReviewShortcut({
        key: event.key,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
        typing: isTypingTarget(event.target),
        detailsOpen: current.detailsOpen,
      })
      if (!action) return

      event.preventDefault()

      switch (action) {
        case 'approve':
          current.approve()
          break
        case 'reject':
          current.reject()
          break
        case 'next':
          current.next()
          break
        case 'prev':
          current.prev()
          break
        case 'undo':
          current.undo()
          break
        case 'toggleClientOnly':
          current.toggleClientOnly()
          break
        case 'toggleRedraw':
          current.setDrawMode(current.drawMode === 'redraw' ? 'off' : 'redraw')
          break
        case 'attachInspected':
          current.attachInspected()
          break
        case 'cycleCrop':
          current.cycleCrop()
          break
        case 'mergeSuggested':
          current.mergeSuggested()
          break
        case 'splitActive':
          current.splitActive()
          break
        case 'addSegment':
          current.addSegment()
          break
        case 'openDetails':
          current.openDetails()
          break
        case 'closeDetails':
          current.closeDetails()
          break
        case 'clearOrCancel':
          if (current.drawMode !== 'off') current.setDrawMode('off')
          else current.clearInspect()
          break
        case 'preventBrowserSave':
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [])
}
