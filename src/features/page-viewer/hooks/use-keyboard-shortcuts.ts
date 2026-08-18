import { useEffect } from 'react'
import { useCropsStore } from '@/features/crops'
import { useSessionStore } from '@/features/edition-session'
import { useViewerStore } from '../store'

export function useKeyboardShortcuts() {
  const nextPage = useSessionStore((state) => state.nextPage)
  const prevPage = useSessionStore((state) => state.prevPage)
  const zoomIn = useViewerStore((state) => state.zoomIn)
  const zoomOut = useViewerStore((state) => state.zoomOut)
  const togglePanMode = useViewerStore((state) => state.togglePanMode)

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return
      }

      switch (event.key) {
        case 'ArrowDown':
        case 'PageDown':
          event.preventDefault()
          nextPage()
          break
        case 'ArrowUp':
        case 'PageUp':
          event.preventDefault()
          prevPage()
          break
        case '+':
        case '=':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            zoomIn()
          }
          break
        case '-':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            zoomOut()
          }
          break
        case ' ':
          event.preventDefault()
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
