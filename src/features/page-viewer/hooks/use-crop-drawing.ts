import { useCallback, useRef, useState } from 'react'
import type { CropRect, Point } from '@/features/crops/geometry'
import { MIN_CROP_SIZE_PERCENT, normalizeDrawRect } from '@/features/crops/geometry'

interface UseCropDrawingOptions {
  enabled: boolean
  containerWidth: number
  containerHeight: number
  onComplete: (rect: CropRect) => void
}

export function useCropDrawing({
  enabled,
  containerWidth,
  containerHeight,
  onComplete,
}: UseCropDrawingOptions) {
  const [draftRect, setDraftRect] = useState<CropRect | null>(null)
  const startRef = useRef<Point | null>(null)
  const isDrawingRef = useRef(false)

  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (!enabled || event.button !== 0 || containerWidth <= 0 || containerHeight <= 0) return
      const target = event.currentTarget as HTMLElement
      target.setPointerCapture(event.pointerId)
      const bounds = target.getBoundingClientRect()
      const point = { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
      startRef.current = point
      isDrawingRef.current = true
      setDraftRect(normalizeDrawRect(point, point, containerWidth, containerHeight))
    },
    [enabled, containerWidth, containerHeight],
  )

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!isDrawingRef.current || !startRef.current) return
      const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
      const point = { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
      setDraftRect(normalizeDrawRect(startRef.current, point, containerWidth, containerHeight))
    },
    [containerWidth, containerHeight],
  )

  const handlePointerUp = useCallback(
    (event: React.PointerEvent) => {
      if (!isDrawingRef.current || !startRef.current) return
      const target = event.currentTarget as HTMLElement
      target.releasePointerCapture(event.pointerId)
      const bounds = target.getBoundingClientRect()
      const point = { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
      const finalRect = normalizeDrawRect(startRef.current, point, containerWidth, containerHeight)
      isDrawingRef.current = false
      startRef.current = null
      setDraftRect(null)
      if (finalRect.width >= MIN_CROP_SIZE_PERCENT && finalRect.height >= MIN_CROP_SIZE_PERCENT) {
        onComplete(finalRect)
      }
    },
    [containerWidth, containerHeight, onComplete],
  )

  return { draftRect, handlePointerDown, handlePointerMove, handlePointerUp }
}
