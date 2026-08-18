import { useCallback, useState } from 'react'

export function useCropDragState() {
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [ungroupZoneActive, setUngroupZoneActive] = useState(false)

  const resetDrag = useCallback(() => {
    setDragId(null)
    setDropTargetId(null)
    setUngroupZoneActive(false)
  }, [])

  const handleDragStart = useCallback((event: React.DragEvent, cropId: string) => {
    event.dataTransfer.setData('text/plain', cropId)
    event.dataTransfer.effectAllowed = 'move'
    setDragId(cropId)
    setDropTargetId(null)
  }, [])

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const readDraggedCropId = useCallback(
    (event: React.DragEvent) => event.dataTransfer.getData('text/plain') || dragId,
    [dragId],
  )

  return {
    dragId,
    dropTargetId,
    ungroupZoneActive,
    setDragId,
    setDropTargetId,
    setUngroupZoneActive,
    resetDrag,
    handleDragStart,
    handleDragOver,
    readDraggedCropId,
  }
}
