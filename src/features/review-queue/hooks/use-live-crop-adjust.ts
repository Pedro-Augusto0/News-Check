import { useCallback, useEffect, useRef, useState } from 'react'
import type { CropRect, CropResizeHandle, Point } from '@/features/crops/geometry'
import { isRectValid, moveRect, resizeRect } from '@/features/crops/geometry'

const HANDLES: CropResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

type Interaction =
  | { type: 'move'; startPoint: Point; startRect: CropRect }
  | { type: 'resize'; handle: CropResizeHandle; startPoint: Point; startRect: CropRect }

interface UseLiveCropAdjustOptions {
  rect: CropRect
  containerWidth: number
  containerHeight: number
  enabled: boolean
  onCommit: (rect: CropRect) => void
}

export function useLiveCropAdjust({
  rect,
  containerWidth,
  containerHeight,
  enabled,
  onCommit,
}: UseLiveCropAdjustOptions) {
  const [liveRect, setLiveRect] = useState(rect)
  const overlayRef = useRef<HTMLDivElement>(null)
  const interactionRef = useRef<Interaction | null>(null)
  const liveRectRef = useRef(liveRect)

  useEffect(() => {
    liveRectRef.current = liveRect
  }, [liveRect])

  useEffect(() => {
    if (!interactionRef.current) setLiveRect(rect)
  }, [rect])

  const localPoint = useCallback((event: React.PointerEvent): Point => {
    const bounds = (overlayRef.current ?? event.currentTarget).getBoundingClientRect()
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
  }, [])

  const handleBoxPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (!enabled || event.button !== 0) return
      event.stopPropagation()
      ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
      interactionRef.current = {
        type: 'move',
        startPoint: localPoint(event),
        startRect: liveRectRef.current,
      }
    },
    [enabled, localPoint],
  )

  const handleHandlePointerDown = useCallback(
    (handle: CropResizeHandle) => (event: React.PointerEvent) => {
      if (!enabled || event.button !== 0) return
      event.stopPropagation()
      ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
      interactionRef.current = {
        type: 'resize',
        handle,
        startPoint: localPoint(event),
        startRect: liveRectRef.current,
      }
    },
    [enabled, localPoint],
  )

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      const interaction = interactionRef.current
      if (!interaction || containerWidth <= 0 || containerHeight <= 0) return
      const point = localPoint(event)
      const deltaX = point.x - interaction.startPoint.x
      const deltaY = point.y - interaction.startPoint.y
      if (interaction.type === 'move') {
        setLiveRect(moveRect(interaction.startRect, deltaX, deltaY, containerWidth, containerHeight))
        return
      }
      setLiveRect(
        resizeRect(
          interaction.startRect,
          interaction.handle,
          deltaX,
          deltaY,
          containerWidth,
          containerHeight,
        ),
      )
    },
    [containerWidth, containerHeight, localPoint],
  )

  const handlePointerUp = useCallback(
    (event: React.PointerEvent) => {
      if (!interactionRef.current) return
      const target = event.currentTarget as HTMLElement
      if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId)
      interactionRef.current = null
      const next = liveRectRef.current
      if (isRectValid(next)) onCommit(next)
    },
    [onCommit],
  )

  return {
    overlayRef,
    liveRect,
    handles: HANDLES,
    handleBoxPointerDown,
    handleHandlePointerDown,
    handlePointerMove,
    handlePointerUp,
  }
}
