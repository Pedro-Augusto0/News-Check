import { useCallback, useRef, useState } from 'react'
import type { CropRect, Point } from '@/utils/cropGeometry'
import { MIN_CROP_SIZE_PERCENT, normalizeDrawRect } from '@/utils/cropGeometry'

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
    (e: React.PointerEvent) => {
      if (!enabled || containerWidth <= 0 || containerHeight <= 0) return
      const target = e.currentTarget as HTMLElement
      target.setPointerCapture(e.pointerId)
      const rect = target.getBoundingClientRect()
      const point = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      startRef.current = point
      isDrawingRef.current = true
      setDraftRect(normalizeDrawRect(point, point, containerWidth, containerHeight))
    },
    [enabled, containerWidth, containerHeight],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawingRef.current || !startRef.current) return
      const target = e.currentTarget as HTMLElement
      const rect = target.getBoundingClientRect()
      const point = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      setDraftRect(normalizeDrawRect(startRef.current, point, containerWidth, containerHeight))
    },
    [containerWidth, containerHeight],
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawingRef.current || !startRef.current) return
      const target = e.currentTarget as HTMLElement
      target.releasePointerCapture(e.pointerId)
      const rect = target.getBoundingClientRect()
      const point = { x: e.clientX - rect.left, y: e.clientY - rect.top }
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
