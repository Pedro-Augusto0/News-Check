import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import { useCropsStore } from '@/stores/cropsStore'
import { useNewsStore } from '@/stores/newsStore'
import { useViewerStore } from '@/stores/viewerStore'
import { useCurrentPdf, useCurrentPage } from '@/hooks/useSessionSelectors'
import { usePageCrops, useCropDisplayIndexMap } from '@/hooks/useCropSelectors'
import { usePageImageRenderer } from '@/hooks/usePageImageRenderer'
import { useCropDrawing } from '@/hooks/useCropDrawing'
import { useNotificationStore } from '@/stores/notificationStore'
import {
  filterCropsByHighlightedNews,
  handleCropListSelection,
  handleImageNewsHighlightAtPoint,
  shouldUseMultiNewsSelection,
} from '@/utils/cropNewsSelection'
import { pageScopeKey } from '@/utils/pageKey'
import { CropOverlay } from './CropOverlay'
import { CropEditOverlay } from './CropEditOverlay'
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
  const addCropToNews = useCropsStore((s) => s.addCropToNews)
  const startEditCrop = useCropsStore((s) => s.startEditCrop)
  const cancelEditCrop = useCropsStore((s) => s.cancelEditCrop)
  const commitEditCrop = useCropsStore((s) => s.commitEditCrop)
  const finalizeCrop = useCropsStore((s) => s.finalizeCrop)
  const deleteCrop = useCropsStore((s) => s.deleteCrop)
  const openTextModal = useCropsStore((s) => s.openTextModal)
  const cropsMap = useCropsStore((s) => s.crops)
  const selectedNewsItemId = useNewsStore((s) => s.selectedNewsItemId)
  const highlightedNewsByPage = useNewsStore((s) => s.highlightedNewsByPage)
  const getNewsItem = useNewsStore((s) => s.getNewsItem)
  const findNewsByCropId = useNewsStore((s) => s.findNewsByCropId)

  const pageHighlightScope = useMemo(
    () =>
      currentPdf
        ? { pdfId: currentPdf.id, pageNumber: selectedPageNumber }
        : undefined,
    [currentPdf, selectedPageNumber],
  )

  const visibleCrops = useMemo(() => {
    const highlightedNewsIds = pageHighlightScope
      ? highlightedNewsByPage[pageScopeKey(pageHighlightScope.pdfId, pageHighlightScope.pageNumber)] ?? {}
      : {}
    return filterCropsByHighlightedNews(crops, highlightedNewsIds, findNewsByCropId)
  }, [crops, highlightedNewsByPage, findNewsByCropId, pageHighlightScope])

  const panMode = useViewerStore((s) => s.panMode)
  const panOffset = useViewerStore((s) => s.panOffset)
  const setPanOffset = useViewerStore((s) => s.setPanOffset)

  const scrollRef = useRef<HTMLDivElement>(null)
  const panStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const [viewportWidth, setViewportWidth] = useState(800)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const update = () => setViewportWidth(el.clientWidth)
    update()

    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [currentPdf?.id, currentPage?.pageNumber])

  const imageUrl = currentPage?.imageUrl
  const { canvasRef, dimensions, error } = usePageImageRenderer(imageUrl, viewportWidth)

  const isEditing = !!editingCropId
  const editingCrop = editingCropId ? cropsMap[editingCropId] : undefined
  const canDrawCrop = !!selectedNewsItemId && !panMode && !isEditing

  useEffect(() => {
    if (!editingCropId) return
    const crop = cropsMap[editingCropId]
    if (!crop || crop.pageNumber !== selectedPageNumber) {
      cancelEditCrop()
    }
  }, [editingCropId, cropsMap, selectedPageNumber, cancelEditCrop])

  const handleCropComplete = useCallback(
    (rect: Parameters<typeof addCropToNews>[0]['rect']) => {
      if (!selectedEditionId || !currentPdf || !currentPage || isEditing || !selectedNewsItemId) {
        return
      }

      const newsItem = getNewsItem(selectedNewsItemId)
      if (!newsItem) return

      const cropId = addCropToNews({
        editionId: selectedEditionId,
        pdfId: currentPdf.id,
        pageNumber: selectedPageNumber,
        rect,
        newsItem,
      })

      if (!cropId) return

      const isCrossPage =
        newsItem.pdfId === currentPdf.id && newsItem.pageNumber !== selectedPageNumber
      if (isCrossPage) {
        const title = newsItem.title.trim() || 'Notícia sem título'
        useNotificationStore.getState().show(`Corte adicionado à notícia «${title}»`)
      }
    },
    [
      addCropToNews,
      selectedEditionId,
      currentPdf,
      currentPage,
      selectedPageNumber,
      isEditing,
      selectedNewsItemId,
      getNewsItem,
    ],
  )

  const { draftRect, handlePointerDown, handlePointerMove, handlePointerUp } = useCropDrawing({
    enabled: canDrawCrop,
    containerWidth: dimensions.width,
    containerHeight: dimensions.height,
    onComplete: handleCropComplete,
  })

  const handleSelectCrop = useCallback(
    (cropId: string | null, event?: React.MouseEvent) => {
      if (!cropId) {
        selectCrop(null)
        return
      }
      handleCropListSelection(
        cropId,
        shouldUseMultiNewsSelection(event, pageHighlightScope),
        pageHighlightScope,
      )
    },
    [selectCrop, pageHighlightScope],
  )

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
      handleSelectCrop(cropId)
    },
    [finalizeCrop, handleSelectCrop],
  )

  const handleViewText = useCallback(
    (cropId: string) => {
      const crop = cropsMap[cropId]
      openTextModal(crop?.groupId ?? cropId)
      handleSelectCrop(cropId)
    },
    [openTextModal, handleSelectCrop, cropsMap],
  )

  const handleDeleteCrop = useCallback(
    (cropId: string) => {
      deleteCrop(cropId)
    },
    [deleteCrop],
  )

  const handleSaveEdit = useCallback(
    (rect: Parameters<typeof commitEditCrop>[1]) => {
      if (!editingCropId) return
      commitEditCrop(editingCropId, rect)
    },
    [editingCropId, commitEditCrop],
  )

  const canvasCursor = isEditing
    ? 'default'
    : panMode
      ? 'grab'
      : canDrawCrop
        ? 'crosshair'
        : 'not-allowed'

  if (!currentPdf || !currentPage) {
    return (
      <div className="page-viewer page-viewer--empty">
        <p>Selecione um veículo e uma página</p>
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
            style={{ cursor: canvasCursor }}
            onPointerDown={(e) => {
              if (isEditing) return

              const target = e.target as HTMLElement
              const onCropBox = target.closest('.crop-box')

              if (!onCropBox && !panMode) {
                const wrap = e.currentTarget as HTMLElement
                const bounds = wrap.getBoundingClientRect()
                const px = e.clientX - bounds.left
                const py = e.clientY - bounds.top
                const handled = handleImageNewsHighlightAtPoint(
                  crops,
                  px,
                  py,
                  dimensions.width,
                  dimensions.height,
                  e,
                  pageHighlightScope,
                )
                if (handled) return
              }

              if (!onCropBox) {
                handleSelectCrop(null)
              }

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
            <CropOverlay
              crops={visibleCrops}
              cropDisplayIndex={cropDisplayIndex}
              selectedCropId={selectedCropId}
              editingCropId={editingCropId}
              draftRect={draftRect}
              width={dimensions.width}
              height={dimensions.height}
              onSelectCrop={handleSelectCrop}
              onViewText={handleViewText}
              onEditCrop={handleEditCrop}
              onFinalizeCrop={handleFinalizeCrop}
              onDeleteCrop={handleDeleteCrop}
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
