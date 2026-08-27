import { useEffect, useRef } from 'react'
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
      if (isTypingTarget(event.target)) return
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const current = actionsRef.current

      if (current.detailsOpen) {
        if (event.key === 'Escape') {
          event.preventDefault()
          current.closeDetails()
        }
        return
      }

      switch (event.key) {
        case ' ':
        case 'Enter':
          event.preventDefault()
          current.approve()
          break
        case 'n':
        case 'N':
          event.preventDefault()
          current.reject()
          break
        case 'j':
        case 'J':
        case 'ArrowDown':
          event.preventDefault()
          current.next()
          break
        case 'k':
        case 'K':
        case 'ArrowUp':
          event.preventDefault()
          current.prev()
          break
        case 'u':
        case 'U':
          event.preventDefault()
          current.undo()
          break
        case 'c':
        case 'C':
          event.preventDefault()
          current.toggleClientOnly()
          break
        case 'r':
        case 'R':
          event.preventDefault()
          current.setDrawMode(current.drawMode === 'redraw' ? 'off' : 'redraw')
          break
        case 'a':
        case 'A':
          event.preventDefault()
          current.attachInspected()
          break
        case ']':
          event.preventDefault()
          current.cycleCrop()
          break
        case 'm':
        case 'M':
          event.preventDefault()
          current.mergeSuggested()
          break
        case 'x':
        case 'X':
          event.preventDefault()
          current.splitActive()
          break
        case 't':
        case 'T':
          event.preventDefault()
          current.openDetails()
          break
        case 'Escape':
          event.preventDefault()
          if (current.drawMode !== 'off') current.setDrawMode('off')
          else current.clearInspect()
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
