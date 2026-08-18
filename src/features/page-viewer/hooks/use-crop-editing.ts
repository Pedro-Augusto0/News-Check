import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import type { CropRect, CropResizeHandle, Point } from '@/features/crops/geometry'
import {
  isRectValid,
  MIN_CROP_SIZE_PERCENT,
  moveRect,
  normalizeDrawRect,
  percentToPx,
  resizeRect,
} from '@/features/crops/geometry'

type Interaction =
  | { type: 'move'; startPoint: Point; startRect: CropRect }
  | { type: 'resize'; handle: CropResizeHandle; startPoint: Point; startRect: CropRect }
  | { type: 'draw'; startPoint: Point }

interface UseCropEditingOptions {
  enabled: boolean
  initialRect: CropRect
  containerWidth: number
  containerHeight: number
  overlayRef: RefObject<HTMLElement | null>
}

const HANDLES: CropResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

export function useCropEditing({
  enabled,
  initialRect,
  containerWidth,
  containerHeight,
  overlayRef,
}: UseCropEditingOptions) {
  const [editRect, setEditRect] = useState<CropRect>(initialRect)
  const [draftRect, setDraftRect] = useState<CropRect | null>(null)
  const interactionRef = useRef<Interaction | null>(null)
  const draftRectRef = useRef<CropRect | null>(null)

  useEffect(() => {
    draftRectRef.current = draftRect
  }, [draftRect])

  useEffect(() => {
    if (enabled) {
      setEditRect(initialRect)
      setDraftRect(null)
      interactionRef.current = null
    }
  }, [enabled, initialRect])

  const getLocalPoint = useCallback(
    (event: React.PointerEvent): Point => {
      const element = overlayRef.current ?? (event.currentTarget as HTMLElement)
      const bounds = element.getBoundingClientRect()
      return { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
    },
    [overlayRef],
  )

  const handleDrawPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (!enabled || containerWidth <= 0 || containerHeight <= 0) return
      event.stopPropagation()
      ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
      const point = getLocalPoint(event)
      interactionRef.current = { type: 'draw', startPoint: point }
      setDraftRect(normalizeDrawRect(point, point, containerWidth, containerHeight))
    },
    [enabled, containerWidth, containerHeight, getLocalPoint],
  )

  const handleBoxPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (!enabled || containerWidth <= 0 || containerHeight <= 0) return
      event.stopPropagation()
      ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
      interactionRef.current = {
        type: 'move',
        startPoint: getLocalPoint(event),
        startRect: editRect,
      }
    },
    [enabled, containerWidth, containerHeight, editRect, getLocalPoint],
  )

  const handleHandlePointerDown = useCallback(
    (handle: CropResizeHandle) => (event: React.PointerEvent) => {
      if (!enabled || containerWidth <= 0 || containerHeight <= 0) return
      event.stopPropagation()
      ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
      interactionRef.current = {
        type: 'resize',
        handle,
        startPoint: getLocalPoint(event),
        startRect: editRect,
      }
    },
    [enabled, containerWidth, containerHeight, editRect, getLocalPoint],
  )

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      const interaction = interactionRef.current
      if (!interaction || containerWidth <= 0 || containerHeight <= 0) return
      const point = getLocalPoint(event)

      if (interaction.type === 'draw') {
        setDraftRect(normalizeDrawRect(interaction.startPoint, point, containerWidth, containerHeight))
        return
      }

      const deltaX = point.x - interaction.startPoint.x
      const deltaY = point.y - interaction.startPoint.y
      if (interaction.type === 'move') {
        setEditRect(moveRect(interaction.startRect, deltaX, deltaY, containerWidth, containerHeight))
        return
      }
      setEditRect(
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
    [containerWidth, containerHeight, getLocalPoint],
  )

  const handlePointerUp = useCallback((event: React.PointerEvent) => {
    const interaction = interactionRef.current
    if (!interaction) return
    const target = event.currentTarget as HTMLElement
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId)
    if (interaction.type === 'draw') {
      const nextDraft = draftRectRef.current
      if (nextDraft && isRectValid(nextDraft)) setEditRect(nextDraft)
    }
    interactionRef.current = null
    setDraftRect(null)
  }, [])

  return {
    editRect,
    displayRect: draftRect ?? editRect,
    draftRect,
    handles: HANDLES,
    handleDrawPointerDown,
    handleBoxPointerDown,
    handleHandlePointerDown,
    handlePointerMove,
    handlePointerUp,
    isValid: isRectValid(editRect),
    minSize: MIN_CROP_SIZE_PERCENT,
  }
}

export function getDimPanels(rect: CropRect, containerWidth: number, containerHeight: number) {
  const pixels = percentToPx(rect, containerWidth, containerHeight)
  return {
    top: { top: 0, left: 0, width: containerWidth, height: Math.max(0, pixels.y) },
    bottom: {
      top: pixels.y + pixels.height,
      left: 0,
      width: containerWidth,
      height: Math.max(0, containerHeight - pixels.y - pixels.height),
    },
    left: { top: pixels.y, left: 0, width: Math.max(0, pixels.x), height: pixels.height },
    right: {
      top: pixels.y,
      left: pixels.x + pixels.width,
      width: Math.max(0, containerWidth - pixels.x - pixels.width),
      height: pixels.height,
    },
  }
}
