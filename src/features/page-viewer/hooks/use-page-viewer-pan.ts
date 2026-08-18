import { useRef } from 'react'
import { useViewerStore } from '../store'

export function usePageViewerPan(enabled: boolean) {
  const panOffset = useViewerStore((state) => state.panOffset)
  const setPanOffset = useViewerStore((state) => state.setPanOffset)
  const panStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  const handlePanStart = (event: React.PointerEvent) => {
    if (!enabled) return
    event.currentTarget.setPointerCapture(event.pointerId)
    panStart.current = { x: event.clientX, y: event.clientY, ox: panOffset.x, oy: panOffset.y }
  }

  const handlePanMove = (event: React.PointerEvent) => {
    if (!enabled || !panStart.current) return
    setPanOffset({
      x: panStart.current.ox + (event.clientX - panStart.current.x),
      y: panStart.current.oy + (event.clientY - panStart.current.y),
    })
  }

  const handlePanEnd = (event: React.PointerEvent) => {
    if (!panStart.current) return
    event.currentTarget.releasePointerCapture(event.pointerId)
    panStart.current = null
  }

  return { panOffset, handlePanStart, handlePanMove, handlePanEnd }
}
