import { useCallback, useEffect, useRef, useState } from 'react'
import type { Crop } from '@/features/crops'
import type { CropDisplayInfo } from '@/features/crops/view-model'
import { cropColor } from '@/features/crops/colors'
import { canMergeCrops } from '@/features/crops/merge'
import { useCropDragState } from '@/features/crops/hooks'
import { useCropsStore } from '@/features/crops/store'

function canMergeInto(source: Crop | undefined, target: Crop | undefined): boolean {
  return canMergeCrops(source, target, (cropId) => useCropsStore.getState().isNewsItemFinalized(cropId))
}

function createMergeDragGhost(label: string, color: string) {
  const ghost = document.createElement('div')
  ghost.className = 'crop-merge-drag-ghost'
  ghost.textContent = label
  ghost.style.setProperty('--crop-accent', color)
  document.body.appendChild(ghost)
  return ghost
}

export function useCropOverlayMerge(
  cropsMap: Record<string, Crop>,
  cropDisplayIndex: Map<string, CropDisplayInfo>,
) {
  const mergeCrops = useCropsStore((s) => s.mergeCrops)
  const ungroupCrop = useCropsStore((s) => s.ungroupCrop)
  const {
    dragId,
    dropTargetId,
    ungroupZoneActive,
    setDropTargetId,
    setUngroupZoneActive,
    setDragId,
    resetDrag,
    readDraggedCropId,
  } = useCropDragState()
  const [mergeFlashId, setMergeFlashId] = useState<string | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const dragGhostRef = useRef<HTMLElement | null>(null)
  const suppressClickCropIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!mergeFlashId) return
    const timer = window.setTimeout(() => setMergeFlashId(null), 650)
    return () => window.clearTimeout(timer)
  }, [mergeFlashId])

  const handleDragStart = useCallback((e: React.DragEvent, cropId: string) => {
    e.dataTransfer.setData('text/plain', cropId)
    e.dataTransfer.effectAllowed = 'move'
    suppressClickCropIdRef.current = cropId
    setDragId(cropId)
    setDropTargetId(null)

    const info = cropDisplayIndex.get(cropId)
    const color = cropColor(info?.colorIndex ?? 0)
    const label = info?.displayIndex !== undefined ? String(info.displayIndex) : '•'
    const ghost = createMergeDragGhost(label, color)
    dragGhostRef.current = ghost
    e.dataTransfer.setDragImage(ghost, 18, 18)
    requestAnimationFrame(() => {
      ghost.remove()
      dragGhostRef.current = null
    })
  }, [cropDisplayIndex, setDragId, setDropTargetId])

  const handleMergeCropClick = useCallback(
    (
      cropId: string,
      onSelectCrop: (cropId: string, event?: React.MouseEvent) => void,
      event?: React.MouseEvent,
    ) => {
      if (suppressClickCropIdRef.current === cropId) return
      onSelectCrop(cropId, event)
    },
    [],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault()
      e.stopPropagation()
      const sourceId = readDraggedCropId(e)
      const source = sourceId ? cropsMap[sourceId] : undefined
      const target = cropsMap[targetId]
      if (sourceId && canMergeInto(source, target)) {
        mergeCrops(sourceId, targetId)
        setMergeFlashId(targetId)
      }
      resetDrag()
    },
    [readDraggedCropId, cropsMap, mergeCrops, resetDrag],
  )

  const handleDragEnter = useCallback(
    (targetId: string) => {
      const sourceId = dragId
      if (!sourceId) return
      const source = cropsMap[sourceId]
      const target = cropsMap[targetId]
      if (canMergeInto(source, target)) {
        setDropTargetId(targetId)
      }
    },
    [dragId, cropsMap, setDropTargetId],
  )

  const handleDragLeave = useCallback((targetId: string) => {
    setDropTargetId((current) => (current === targetId ? null : current))
  }, [setDropTargetId])

  const handleUngroupDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const sourceId = readDraggedCropId(e)
      if (sourceId && cropsMap[sourceId]?.groupId) {
        ungroupCrop(sourceId)
      }
      resetDrag()
    },
    [readDraggedCropId, cropsMap, ungroupCrop, resetDrag],
  )

  const handleDragLeaveOverlay = useCallback((e: React.DragEvent) => {
    if (!overlayRef.current?.contains(e.relatedTarget as Node)) {
      setDropTargetId(null)
    }
  }, [setDropTargetId])

  const handleDragEnd = useCallback(() => {
    resetDrag()
    dragGhostRef.current?.remove()
    dragGhostRef.current = null
    requestAnimationFrame(() => {
      suppressClickCropIdRef.current = null
    })
  }, [resetDrag])

  return {
    dragId,
    dropTargetId,
    ungroupZoneActive,
    setUngroupZoneActive,
    mergeFlashId,
    overlayRef,
    handleDragStart,
    handleMergeCropClick,
    handleDragOver,
    handleDrop,
    handleDragEnter,
    handleDragLeave,
    handleUngroupDrop,
    handleDragLeaveOverlay,
    handleDragEnd,
  }
}
