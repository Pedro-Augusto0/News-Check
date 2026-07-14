import { useCallback, useEffect, useRef } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import { useCropsStore } from '@/stores/cropsStore'
import { useViewerStore } from '@/stores/viewerStore'
import { useCurrentPdf, useCurrentPage } from '@/hooks/useSessionSelectors'
import { usePageCrops, useCropDisplayIndexMap } from '@/hooks/useCropSelectors'
import { usePdfPageRenderer } from '@/hooks/usePdfPageRenderer'
import { useCropDrawing } from '@/hooks/useCropDrawing'
import { extractAndSaveCropText } from '@/services/cropTextExtraction'
import { CropOverlay } from './CropOverlay'
import { CropEditOverlay } from './CropEditOverlay'
import { KeywordLayer } from './KeywordLayer'
import { ViewerToolbar } from './ViewerToolbar'
import './page-viewer.css'

export function PageViewer() {
  const currentPdf = useCurrentPdf()
  const currentPage = useCurrentPage()
  const selectedEditionId = useSessionStore((s) => s.selectedEditionId)
  const selectedPageNumber = useSessionStore((s) => s.selectedPageNumber)

  const crops = usePageCrops(currentPdf?.id, selectedPageNumber)
  const cropDisplayIndex = useCropDisplayIndexMap(selectedEditionId, currentPdf?.id)
  const selectedCropId = useCropsStore((s) => s.selectedCropId)
  const editingCropId = useCropsStore((s) => s.editingCropId)
  const selectCrop = useCropsStore((s) => s.selectCrop)
  const addCrop = useCropsStore((s) => s.addCrop)
  const startEditCrop = useCropsStore((s) => s.startEditCrop)
  const cancelEditCrop = useCropsStore((s) => s.cancelEditCrop)
  const commitEditCrop = useCropsStore((s) => s.commitEditCrop)
  const finalizeCrop = useCropsStore((s) => s.finalizeCrop)
  const openTextModal = useCropsStore((s) => s.openTextModal)
  const cropsMap = useCropsStore((s) => s.crops)

  const panMode = useViewerStore((s) => s.panMode)
  const panOffset = useViewerStore((s) => s.panOffset)
  const setPanOffset = useViewerStore((s) => s.setPanOffset)

  const scrollRef = useRef<HTMLDivElement>(null)
  const panStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  const pdfUrl = currentPdf?.url
  const pageNumber = selectedPageNumber
  const { canvasRef, dimensions, error } = usePdfPageRenderer(pdfUrl, pageNumber)

  const isEditing = !!editingCropId
  const editingCrop = editingCropId ? cropsMap[editingCropId] : undefined

  useEffect(() => {
    if (!editingCropId) return
    const crop = cropsMap[editingCropId]
    if (!crop || crop.pageNumber !== selectedPageNumber) {
      cancelEditCrop()
    }
  }, [editingCropId, cropsMap, selectedPageNumber, cancelEditCrop])

  const handleCropComplete = useCallback(
    (rect: Parameters<typeof addCrop>[0]['rect']) => {
      if (!selectedEditionId || !currentPdf || isEditing) return
      const cropId = addCrop({
        editionId: selectedEditionId,
        pdfId: currentPdf.id,
        pageNumber: selectedPageNumber,
        rect,
        text: '',
      })
      const crop = useCropsStore.getState().crops[cropId]
      if (crop) void extractAndSaveCropText(crop, currentPdf.url)
    },
    [addCrop, selectedEditionId, currentPdf, selectedPageNumber, isEditing],
  )

  const { draftRect, handlePointerDown, handlePointerMove, handlePointerUp } = useCropDrawing({
    enabled: !panMode && !isEditing,
    containerWidth: dimensions.width,
    containerHeight: dimensions.height,
    onComplete: handleCropComplete,
  })

  const handlePanStart = (e: React.PointerEvent) => {
    if (!panMode || isEditing) return
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)
    panStart.current = { x: e.clientX, y: e.clientY, ox: panOffset.x, oy: panOffset.y }
  }

  const handlePanMove = (e: React.PointerEvent) => {
    if (!panMode || !panStart.current) return
    setPanOffset({
      x: panStart.current.ox + (e.clientX - panStart.current.x),
      y: panStart.current.oy + (e.clientY - panStart.current.y),
    })
  }

  const handlePanEnd = (e: React.PointerEvent) => {
    if (!panStart.current) return
    const target = e.currentTarget as HTMLElement
    target.releasePointerCapture(e.pointerId)
    panStart.current = null
  }

  const handleEditCrop = useCallback(
    (cropId: string) => {
      startEditCrop(cropId)
    },
    [startEditCrop],
  )

  const handleFinalizeCrop = useCallback(
    (cropId: string) => {
      finalizeCrop(cropId)
      selectCrop(cropId)
    },
    [finalizeCrop, selectCrop],
  )

  const handleViewText = useCallback(
    (cropId: string) => {
      const crop = cropsMap[cropId]
      openTextModal(crop?.groupId ?? cropId)
      selectCrop(cropId)
    },
    [openTextModal, selectCrop, cropsMap],
  )

  const handleSaveEdit = useCallback(
    (rect: Parameters<typeof commitEditCrop>[1]) => {
      if (!editingCropId || !currentPdf) return
      commitEditCrop(editingCropId, rect)
      const crop = useCropsStore.getState().crops[editingCropId]
      if (crop) void extractAndSaveCropText(crop, currentPdf.url)
    },
    [editingCropId, commitEditCrop, currentPdf],
  )

  if (!currentPdf || !currentPage) {
    return (
      <div className="page-viewer page-viewer--empty">
        <p>Selecione um PDF e uma página</p>
      </div>
    )
  }

  return (
    <div className="page-viewer">
      <ViewerToolbar />
      <div className="page-viewer__scroll" ref={scrollRef}>
        <div
          className="page-viewer__stage"
          style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px)` }}
        >
          <div
            className="page-viewer__canvas-wrap"
            style={{
              cursor: isEditing ? 'default' : panMode ? 'grab' : 'crosshair',
            }}
            onPointerDown={(e) => {
              if (isEditing) return
              if (panMode) handlePanStart(e)
              else handlePointerDown(e)
            }}
            onPointerMove={(e) => {
              if (isEditing) return
              if (panMode) handlePanMove(e)
              else handlePointerMove(e)
            }}
            onPointerUp={(e) => {
              if (isEditing) return
              if (panMode) handlePanEnd(e)
              else handlePointerUp(e)
            }}
          >
            <canvas ref={canvasRef} className="page-viewer__canvas" />
            <KeywordLayer
              occurrences={currentPage.keywordOccurrences}
              width={dimensions.width}
              height={dimensions.height}
            />
            <CropOverlay
              crops={crops}
              cropDisplayIndex={cropDisplayIndex}
              selectedCropId={selectedCropId}
              editingCropId={editingCropId}
              draftRect={draftRect}
              width={dimensions.width}
              height={dimensions.height}
              onSelectCrop={selectCrop}
              onViewText={handleViewText}
              onEditCrop={handleEditCrop}
              onFinalizeCrop={handleFinalizeCrop}
            />
            {editingCrop && (
              <CropEditOverlay
                key={editingCrop.id}
                crop={editingCrop}
                cropDisplayInfo={cropDisplayIndex.get(editingCrop.id)}
                containerWidth={dimensions.width}
                containerHeight={dimensions.height}
                onSave={handleSaveEdit}
                onCancel={cancelEditCrop}
              />
            )}
          </div>
          {error && <p className="page-viewer__error">{error}</p>}
        </div>
      </div>
    </div>
  )
}
