import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import type { CropRect, CropResizeHandle, Point } from '@/utils/cropGeometry'
import {
  isRectValid,
  MIN_CROP_SIZE_PERCENT,
  moveRect,
  normalizeDrawRect,
  percentToPx,
  resizeRect,
} from '@/utils/cropGeometry'

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
    (e: React.PointerEvent): Point => {
      const bounds = (overlayRef.current ?? e.currentTarget as HTMLElement).getBoundingClientRect()
      return { x: e.clientX - bounds.left, y: e.clientY - bounds.top }
    },
    [overlayRef],
  )

  const handleDrawPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled || containerWidth <= 0 || containerHeight <= 0) return
      e.stopPropagation()
      const target = e.currentTarget as HTMLElement
      target.setPointerCapture(e.pointerId)
      const point = getLocalPoint(e)
      interactionRef.current = { type: 'draw', startPoint: point }
      setDraftRect(normalizeDrawRect(point, point, containerWidth, containerHeight))
    },
    [enabled, containerWidth, containerHeight, getLocalPoint],
  )

  const handleBoxPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled || containerWidth <= 0 || containerHeight <= 0) return
      e.stopPropagation()
      const target = e.currentTarget as HTMLElement
      target.setPointerCapture(e.pointerId)
      const point = getLocalPoint(e)
      interactionRef.current = {
        type: 'move',
        startPoint: point,
        startRect: editRect,
      }
    },
    [enabled, containerWidth, containerHeight, editRect, getLocalPoint],
  )

  const handleHandlePointerDown = useCallback(
    (handle: CropResizeHandle) => (e: React.PointerEvent) => {
      if (!enabled || containerWidth <= 0 || containerHeight <= 0) return
      e.stopPropagation()
      const target = e.currentTarget as HTMLElement
      target.setPointerCapture(e.pointerId)
      const point = getLocalPoint(e)
      interactionRef.current = {
        type: 'resize',
        handle,
        startPoint: point,
        startRect: editRect,
      }
    },
    [enabled, containerWidth, containerHeight, editRect, getLocalPoint],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const interaction = interactionRef.current
      if (!interaction || containerWidth <= 0 || containerHeight <= 0) return

      const point = getLocalPoint(e)

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
        resizeRect(interaction.startRect, interaction.handle, deltaX, deltaY, containerWidth, containerHeight),
      )
    },
    [containerWidth, containerHeight, getLocalPoint],
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const interaction = interactionRef.current
      if (!interaction) return

      const target = e.currentTarget as HTMLElement
      if (target.hasPointerCapture(e.pointerId)) {
        target.releasePointerCapture(e.pointerId)
      }

      if (interaction.type === 'draw') {
        const nextDraft = draftRectRef.current
        if (nextDraft && isRectValid(nextDraft)) {
          setEditRect(nextDraft)
        }
      }

      interactionRef.current = null
      setDraftRect(null)
    },
    [],
  )

  const displayRect = draftRect ?? editRect

  return {
    editRect,
    displayRect,
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

export function getDimPanels(rect: CropRect, containerW: number, containerH: number) {
  const px = percentToPx(rect, containerW, containerH)
  return {
    top: { top: 0, left: 0, width: containerW, height: Math.max(0, px.y) },
    bottom: {
      top: px.y + px.height,
      left: 0,
      width: containerW,
      height: Math.max(0, containerH - px.y - px.height),
    },
    left: { top: px.y, left: 0, width: Math.max(0, px.x), height: px.height },
    right: {
      top: px.y,
      left: px.x + px.width,
      width: Math.max(0, containerW - px.x - px.width),
      height: px.height,
    },
  }
}
