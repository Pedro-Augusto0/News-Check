import { useEffect } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import { useCropsStore } from '@/stores/cropsStore'
import { useViewerStore } from '@/stores/viewerStore'

export function useKeyboardShortcuts() {
  const nextPage = useSessionStore((s) => s.nextPage)
  const prevPage = useSessionStore((s) => s.prevPage)
  const zoomIn = useViewerStore((s) => s.zoomIn)
  const zoomOut = useViewerStore((s) => s.zoomOut)
  const togglePanMode = useViewerStore((s) => s.togglePanMode)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return
      }

      switch (e.key) {
        case 'ArrowDown':
        case 'PageDown':
          e.preventDefault()
          nextPage()
          break
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault()
          prevPage()
          break
        case '+':
        case '=':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            zoomIn()
          }
          break
        case '-':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            zoomOut()
          }
          break
        case ' ':
          e.preventDefault()
          togglePanMode()
          break
        case 'Escape':
          useCropsStore.getState().selectCrop(null)
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [nextPage, prevPage, zoomIn, zoomOut, togglePanMode])
}
