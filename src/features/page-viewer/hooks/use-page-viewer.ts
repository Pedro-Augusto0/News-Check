import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSessionStore } from '@/features/edition-session'
import { useCropsStore } from '@/features/crops'
import { useNewsStore } from '@/features/news'
import { useCurrentPdf } from '@/features/edition-session/hooks'
import { useCurrentPage } from '@/features/page-navigation/hooks'
import { useNewsCropsViewModel } from '@/features/news/hooks'
import { useNotificationStore } from '@/features/notifications'
import {
  filterCropsByHighlightedNews,
  handleCropListSelection,
  handleImageNewsHighlightAtPoint,
  hitTestCropsAtPoint,
  resolveImageInteraction,
  shouldUseMultiNewsSelection,
} from '@/features/crop-news-linking'
import { pageScopeKey } from '@/features/page-navigation/page-key'
import { useCropDrawing } from './use-crop-drawing'
import { usePageImageRenderer } from './use-page-image-renderer'
import { usePageViewerPan } from './use-page-viewer-pan'
import { useViewerStore } from '../store'

export function usePageViewer() {
  const currentPdf = useCurrentPdf()
  const currentPage = useCurrentPage()
  const selectedEditionId = useSessionStore((s) => s.selectedEditionId)
  const selectedPageNumber = useSessionStore((s) => s.selectedPageNumber)

  const isNewsItemFinalized = useCropsStore((s) => s.isNewsItemFinalized)
  const newsCropsViewModel = useNewsCropsViewModel({
    editionId: selectedEditionId,
    pdfId: currentPdf?.id,
  })
  const crops = newsCropsViewModel.pageCrops.get(selectedPageNumber) ?? []
  const cropDisplayIndex = newsCropsViewModel.cropDisplayIndex
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

  const overlayFinalizedCrops = useMemo(
    () => crops.filter((crop) => newsCropsViewModel.finalizedCropIds.has(crop.id)),
    [crops, newsCropsViewModel.finalizedCropIds],
  )

  const overlayInteractiveCrops = useMemo(() => {
    const highlightedNewsIds = pageHighlightScope
      ? highlightedNewsByPage[pageScopeKey(pageHighlightScope.pdfId, pageHighlightScope.pageNumber)] ?? {}
      : {}
    return filterCropsByHighlightedNews(crops, highlightedNewsIds, findNewsByCropId).filter(
      (crop) => !newsCropsViewModel.finalizedCropIds.has(crop.id),
    )
  }, [
    crops,
    highlightedNewsByPage,
    findNewsByCropId,
    pageHighlightScope,
    newsCropsViewModel.finalizedCropIds,
  ])

  const panMode = useViewerStore((s) => s.panMode)
  const isEditing = !!editingCropId
  const { panOffset, handlePanStart, handlePanMove, handlePanEnd } = usePageViewerPan(panMode && !isEditing)

  const scrollRef = useRef<HTMLDivElement>(null)
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
        shouldUseMultiNewsSelection(event),
        pageHighlightScope,
      )
    },
    [selectCrop, pageHighlightScope],
  )

  const handleEditCrop = useCallback(
    (cropId: string) => {
      startEditCrop(cropId)
    },
    [startEditCrop],
  )

  const handleFinalizeCrop = useCallback(
    (cropId: string) => {
      finalizeCrop(cropId)
    },
    [finalizeCrop],
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

  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement
      if (target.closest('.crop-box__actions, .crop-box__merge-handle')) return

      const wrap = e.currentTarget
      const bounds = wrap.getBoundingClientRect()
      const px = e.clientX - bounds.left
      const py = e.clientY - bounds.top
      const hit = hitTestCropsAtPoint(
        crops,
        px,
        py,
        dimensions.width,
        dimensions.height,
        isNewsItemFinalized,
      )
      const action = resolveImageInteraction({
        gesture: 'pointerdown',
        isEditing,
        panMode,
        hitKind: hit.kind,
      })

      if (action === 'ignore') return
      if (action === 'pan') {
        handlePanStart(e)
        return
      }

      if (hit.kind === 'miss') {
        handleSelectCrop(null)
      }

      handlePointerDown(e)
    },
    [
      isEditing,
      panMode,
      crops,
      dimensions.width,
      dimensions.height,
      isNewsItemFinalized,
      handleSelectCrop,
      handlePanStart,
      handlePointerDown,
    ],
  )

  const handleCanvasDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement
      if (target.closest('.crop-box__actions, .crop-box__merge-handle')) return

      const wrap = e.currentTarget
      const bounds = wrap.getBoundingClientRect()
      const px = e.clientX - bounds.left
      const py = e.clientY - bounds.top
      const hit = hitTestCropsAtPoint(
        crops,
        px,
        py,
        dimensions.width,
        dimensions.height,
        isNewsItemFinalized,
      )
      const action = resolveImageInteraction({
        gesture: 'dblclick',
        isEditing,
        panMode,
        hitKind: hit.kind,
      })
      if (action !== 'select-news') return

      handleImageNewsHighlightAtPoint(
        crops,
        px,
        py,
        dimensions.width,
        dimensions.height,
        e,
        pageHighlightScope,
      )
    },
    [
      isEditing,
      panMode,
      crops,
      dimensions.width,
      dimensions.height,
      isNewsItemFinalized,
      pageHighlightScope,
    ],
  )

  const handleCanvasPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isEditing) return
      if (panMode) handlePanMove(e)
      else handlePointerMove(e)
    },
    [isEditing, panMode, handlePanMove, handlePointerMove],
  )

  const handleCanvasPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isEditing) return
      if (panMode) handlePanEnd(e)
      else handlePointerUp(e)
    },
    [isEditing, panMode, handlePanEnd, handlePointerUp],
  )

  return {
    currentPdf,
    currentPage,
    panOffset,
    scrollRef,
    canvasCursor,
    handleCanvasPointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerUp,
    handleCanvasDoubleClick,
    canvasRef,
    error,
    overlayInteractiveCrops,
    overlayFinalizedCrops,
    cropDisplayIndex,
    selectedCropId,
    editingCropId,
    draftRect,
    dimensions,
    handleSelectCrop,
    handleViewText,
    handleEditCrop,
    handleFinalizeCrop,
    handleDeleteCrop,
    editingCrop,
    handleSaveEdit,
    cancelEditCrop,
  }
}
