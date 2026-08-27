import { useCallback, useEffect, useMemo, useState } from 'react'
import { useCropsStore } from '@/features/crops'
import { buildClientCountByPage } from '@/features/crops/client-stats'
import { canMergeCrops } from '@/features/crops/merge'
import { useNewsStore } from '@/features/news'
import { useCurrentEdition, useCurrentPdf, useSessionStore } from '@/features/edition-session'
import { useCurrentPage } from '@/features/page-navigation'
import { buildNewsCountByPage } from '@/features/page-navigation/stats'
import {
  buildReviewQueue,
  canAttachNews,
  collectApprovedCropIds,
  filterActiveReviewItems,
  findMergeCandidate,
  firstPendingId,
  rankQueueForReview,
  resolveReviewItemClick,
} from '../application'
import { useReviewQueueStore } from '../store'
import type { ReviewStatus, ReviewWorkMode } from '../model'

export function useReviewSession() {
  const edition = useCurrentEdition()
  const pdf = useCurrentPdf()
  const currentPage = useCurrentPage()
  const selectPage = useSessionStore((state) => state.selectPage)
  const selectedPageNumber = useSessionStore((state) => state.selectedPageNumber)

  const crops = useCropsStore((state) => state.crops)
  const groups = useCropsStore((state) => state.groups)
  const newsItems = useNewsStore((state) => state.items)
  const isLoadingNews = useNewsStore((state) => state.isLoadingNews)
  const getNewsItem = useNewsStore((state) => state.getNewsItem)
  const addCropToNews = useCropsStore((state) => state.addCropToNews)
  const updateCropRect = useCropsStore((state) => state.updateCropRect)
  const mergeCrops = useCropsStore((state) => state.mergeCrops)
  const ungroupCrop = useCropsStore((state) => state.ungroupCrop)
  const isNewsItemFinalized = useCropsStore((state) => state.isNewsItemFinalized)
  const deleteCrop = useCropsStore((state) => state.deleteCrop)
  const setNewsItemIdForRelatedCrops = useCropsStore((state) => state.setNewsItemIdForRelatedCrops)
  const consolidateNewsAfterCropMerge = useNewsStore((state) => state.consolidateNewsAfterCropMerge)
  const splitNewsForUngroupedCrop = useNewsStore((state) => state.splitNewsForUngroupedCrop)

  const hydrateEdition = useReviewQueueStore((state) => state.hydrateEdition)
  const currentId = useReviewQueueStore((state) => state.currentId)
  const setCurrentId = useReviewQueueStore((state) => state.setCurrentId)
  const inspectId = useReviewQueueStore((state) => state.inspectId)
  const setInspectId = useReviewQueueStore((state) => state.setInspectId)
  const statuses = useReviewQueueStore((state) => state.statuses)
  const clientOnly = useReviewQueueStore((state) => state.clientOnly)
  const workMode = useReviewQueueStore((state) => state.workMode)
  const setWorkModeStore = useReviewQueueStore((state) => state.setWorkMode)
  const drawMode = useReviewQueueStore((state) => state.drawMode)
  const setDrawMode = useReviewQueueStore((state) => state.setDrawMode)
  const activeCropIndex = useReviewQueueStore((state) => state.activeCropIndex)
  const setActiveCropIndex = useReviewQueueStore((state) => state.setActiveCropIndex)
  const markStatus = useReviewQueueStore((state) => state.markStatus)
  const toggleClientOnly = useReviewQueueStore((state) => state.toggleClientOnly)
  const undo = useReviewQueueStore((state) => state.undo)
  const undoStack = useReviewQueueStore((state) => state.undoStack)

  useEffect(() => {
    if (edition?.id) hydrateEdition(edition.id)
  }, [edition?.id, hydrateEdition])

  const queue = useMemo(() => {
    if (!edition || !pdf) return []
    return buildReviewQueue({
      editionId: edition.id,
      pdfId: pdf.id,
      pages: pdf.pages,
      newsItems,
      crops,
      groups,
    })
  }, [edition, pdf, newsItems, crops, groups])

  const activeQueue = useMemo(
    () => filterActiveReviewItems(queue, statuses, clientOnly),
    [queue, statuses, clientOnly],
  )

  const rankedQueue = useMemo(
    () => rankQueueForReview(activeQueue, statuses, false),
    [activeQueue, statuses],
  )

  const approvedCropIds = useMemo(
    () => collectApprovedCropIds(queue, statuses),
    [queue, statuses],
  )

  useEffect(() => {
    if (rankedQueue.length === 0) {
      if (currentId) setCurrentId(null)
      return
    }
    const stillVisible = rankedQueue.some((item) => item.id === currentId)
    if (!currentId || !stillVisible) {
      setCurrentId(firstPendingId(rankedQueue, statuses))
    }
  }, [rankedQueue, currentId, statuses, setCurrentId])

  const listItems = activeQueue

  const currentItem = listItems.find((item) => item.id === currentId) ?? null
  const inspectItem =
    inspectId && inspectId !== currentId
      ? (listItems.find((item) => item.id === inspectId) ?? null)
      : null
  const currentNewsKey = currentItem?.id ?? null
  const newsPageNumber = currentItem?.pageNumber
  const inspectItemId = inspectItem?.id ?? null
  const inspectPageNumber = inspectItem?.pageNumber

  useEffect(() => {
    if (!inspectItemId || !inspectPageNumber) return
    selectPage(inspectPageNumber)
  }, [inspectItemId, inspectPageNumber, selectPage])

  // Follow the active news page only when that news changes.
  // Clearing inspect (e.g. after attach) must not snap back to news 1.
  useEffect(() => {
    if (!currentNewsKey || !newsPageNumber) return
    selectPage(newsPageNumber)
  }, [currentNewsKey, newsPageNumber, selectPage])

  const viewPage = useCallback(
    (pageNumber: string) => {
      selectPage(pageNumber)
    },
    [selectPage],
  )

  const pageCrops = useMemo(() => {
    if (!pdf || !currentPage) return []
    return Object.values(crops).filter(
      (crop) => crop.pdfId === pdf.id && crop.pageNumber === currentPage.pageNumber,
    )
  }, [crops, pdf, currentPage])

  useEffect(() => {
    if (inspectId && !activeQueue.some((item) => item.id === inspectId)) {
      setInspectId(null)
    }
  }, [activeQueue, inspectId, setInspectId])

  const currentCrops = useMemo(() => {
    if (!currentItem) return []
    return currentItem.cropIds
      .map((id) => crops[id])
      .filter((crop): crop is NonNullable<typeof crop> => !!crop)
  }, [currentItem, crops])

  const inspectCrops = useMemo(() => {
    if (!inspectItem) return []
    return inspectItem.cropIds
      .map((id) => crops[id])
      .filter((crop): crop is NonNullable<typeof crop> => !!crop)
  }, [inspectItem, crops])

  const [inspectCropIndex, setInspectCropIndex] = useState(0)

  const activeCrop = currentCrops[Math.min(activeCropIndex, Math.max(0, currentCrops.length - 1))]
  const inspectCrop = inspectCrops[Math.min(inspectCropIndex, Math.max(0, inspectCrops.length - 1))]

  const mergeCandidate = useMemo(() => {
    if (!activeCrop) return null
    const candidate = findMergeCandidate(activeCrop, pageCrops, new Set(currentItem?.cropIds ?? []))
    if (!candidate) return null
    return canMergeCrops(activeCrop, candidate, isNewsItemFinalized) ? candidate : null
  }, [activeCrop, pageCrops, currentItem, isNewsItemFinalized])

  const progress = useMemo(() => {
    const all = clientOnly ? queue.filter((item) => item.hasClient) : queue
    const done = all.filter((item) => {
      const status = statuses[item.id]
      return status === 'approved' || status === 'rejected'
    }).length
    return { done, total: all.length }
  }, [queue, statuses, clientOnly])

  const pageStats = useMemo(() => {
    if (!pdf) return []

    const newsCountByPage = buildNewsCountByPage(newsItems, pdf.id)
    const clientCountByPage = buildClientCountByPage(crops, pdf.id)

    return pdf.pages.map((page) => {
      const pageItems = queue.filter((item) => item.pageNumber === page.pageNumber)
      const pendingItems = pageItems.filter((item) => {
        const status = statuses[item.id]
        return status !== 'approved' && status !== 'rejected'
      })
      const clientNewsCount = pageItems.filter((item) => item.hasClient).length

      return {
        pageNumber: page.pageNumber,
        total: pendingItems.length,
        pending: pendingItems.length,
        newsCount: newsCountByPage.get(page.pageNumber) ?? 0,
        clientCount: clientCountByPage.get(page.pageNumber) ?? 0,
        clientNewsCount,
        hasClient: clientNewsCount > 0,
        hasSuspect: pendingItems.some((item) => item.suspectReasons.length > 0),
        reviewed: pageItems.length > 0 && pendingItems.length === 0,
      }
    })
  }, [pdf, queue, statuses, newsItems, crops])

  const inspectNews = useCallback(
    (id: string, cropId?: string) => {
      const item = queue.find((entry) => entry.id === id)
      if (!item || item.id === currentId) return
      const cropIndex = cropId ? item.cropIds.indexOf(cropId) : 0
      setInspectId(id)
      setInspectCropIndex(cropIndex >= 0 ? cropIndex : 0)
    },
    [queue, currentId, setInspectId],
  )

  const clearInspect = useCallback(() => {
    setInspectId(null)
  }, [setInspectId])

  const goTo = useCallback(
    (id: string) => {
      if (resolveReviewItemClick(workMode, currentId, id) === 'preview') {
        inspectNews(id)
        return
      }
      setInspectId(null)
      setCurrentId(id)
    },
    [workMode, currentId, inspectNews, setCurrentId, setInspectId],
  )

  const setWorkMode = useCallback(
    (mode: ReviewWorkMode) => {
      setWorkModeStore(mode)
    },
    [setWorkModeStore],
  )

  const step = useCallback(
    (direction: 1 | -1) => {
      if (workMode === 'focus') return
      if (rankedQueue.length === 0) return
      const index = rankedQueue.findIndex((item) => item.id === currentId)
      const nextIndex =
        index < 0
          ? 0
          : (index + direction + rankedQueue.length) % rankedQueue.length
      setCurrentId(rankedQueue[nextIndex]?.id ?? null)
    },
    [workMode, rankedQueue, currentId, setCurrentId],
  )

  const advanceAfter = useCallback(
    (itemId: string) => {
      const pending = rankedQueue.filter((item) => {
        if (item.id === itemId) return false
        const status = statuses[item.id]
        return status !== 'approved' && status !== 'rejected'
      })
      setCurrentId(pending[0]?.id ?? rankedQueue.find((item) => item.id !== itemId)?.id ?? null)
    },
    [rankedQueue, statuses, setCurrentId],
  )

  const applyStatus = useCallback(
    (status: ReviewStatus) => {
      if (!currentItem) return
      markStatus(currentItem.id, status)
      if (workMode === 'focus') setWorkModeStore('free')
      advanceAfter(currentItem.id)
    },
    [currentItem, markStatus, workMode, setWorkModeStore, advanceAfter],
  )

  const approve = useCallback(() => applyStatus('approved'), [applyStatus])
  const reject = useCallback(() => applyStatus('rejected'), [applyStatus])

  const rejectItem = useCallback(
    (itemId: string) => {
      const status = statuses[itemId]
      if (status === 'approved' || status === 'rejected') return
      markStatus(itemId, 'rejected')
      if (inspectId === itemId) setInspectId(null)
      if (currentId === itemId) advanceAfter(itemId)
    },
    [statuses, markStatus, inspectId, setInspectId, currentId, advanceAfter],
  )

  const cycleCrop = useCallback(() => {
    if (currentCrops.length <= 1) return
    const nextIndex = (activeCropIndex + 1) % currentCrops.length
    const nextCrop = currentCrops[nextIndex]
    setActiveCropIndex(nextIndex)
    if (nextCrop && nextCrop.pageNumber !== selectedPageNumber) {
      selectPage(nextCrop.pageNumber)
    }
  }, [currentCrops, activeCropIndex, setActiveCropIndex, selectedPageNumber, selectPage])

  const selectCrop = useCallback(
    (cropId: string) => {
      const currentIndex = currentCrops.findIndex((crop) => crop.id === cropId)
      if (currentIndex >= 0) {
        setActiveCropIndex(currentIndex)
        const crop = currentCrops[currentIndex]
        if (crop && crop.pageNumber !== selectedPageNumber) {
          selectPage(crop.pageNumber)
        }
        return
      }
      const nextInspectIndex = inspectCrops.findIndex((crop) => crop.id === cropId)
      if (nextInspectIndex >= 0) {
        setInspectCropIndex(nextInspectIndex)
        const crop = inspectCrops[nextInspectIndex]
        if (crop && crop.pageNumber !== selectedPageNumber) {
          selectPage(crop.pageNumber)
        }
        return
      }
      const owner = listItems.find((item) => item.cropIds.includes(cropId))
      if (owner) inspectNews(owner.id, cropId)
    },
    [currentCrops, inspectCrops, setActiveCropIndex, selectedPageNumber, selectPage, listItems, inspectNews],
  )

  const attachInspected = useCallback(() => {
    if (!canAttachNews(currentItem, inspectItem) || !currentItem?.newsId || !inspectItem) return
    const inspectCropIds = inspectItem.cropIds.filter((id) => crops[id])
    const targetId = currentCrops[0]?.id
    if (targetId) {
      for (const id of inspectCropIds) {
        if (id !== targetId) mergeCrops(id, targetId)
      }
    } else if (inspectCropIds.length > 0) {
      for (const id of inspectCropIds) {
        setNewsItemIdForRelatedCrops(id, currentItem.newsId)
      }
      if (inspectItem.newsId && inspectItem.newsId !== currentItem.newsId) {
        consolidateNewsAfterCropMerge({
          keepNewsId: currentItem.newsId,
          removeNewsIds: [inspectItem.newsId],
        })
      }
    } else if (inspectItem.newsId && inspectItem.newsId !== currentItem.newsId) {
      consolidateNewsAfterCropMerge({
        keepNewsId: currentItem.newsId,
        removeNewsIds: [inspectItem.newsId],
      })
    }
    setInspectId(null)
  }, [
    currentItem,
    inspectItem,
    crops,
    currentCrops,
    mergeCrops,
    setNewsItemIdForRelatedCrops,
    consolidateNewsAfterCropMerge,
    setInspectId,
  ])

  const mergeSuggested = useCallback(() => {
    if (!activeCrop || !mergeCandidate) return
    mergeCrops(activeCrop.id, mergeCandidate.id)
  }, [activeCrop, mergeCandidate, mergeCrops])

  const splitActive = useCallback(() => {
    if (!activeCrop?.groupId) return
    ungroupCrop(activeCrop.id)
  }, [activeCrop, ungroupCrop])

  const ungroupRelatedCrop = useCallback(
    (cropId: string) => {
      const crop = crops[cropId]
      if (crop?.groupId) {
        ungroupCrop(cropId)
        return
      }
      splitNewsForUngroupedCrop(cropId)
    },
    [crops, ungroupCrop, splitNewsForUngroupedCrop],
  )

  const discardCrop = useCallback(
    (cropId: string) => {
      const inspectIndex = inspectCrops.findIndex((crop) => crop.id === cropId)
      if (inspectIndex >= 0) {
        deleteCrop(cropId)
        setInspectCropIndex((index) => Math.min(index, Math.max(0, inspectCrops.length - 2)))
        return
      }
      const remaining = currentCrops.filter((crop) => crop.id !== cropId)
      deleteCrop(cropId)
      if (remaining.length === 0 && currentItem?.kind === 'news') {
        setDrawMode('off')
        setActiveCropIndex(0)
        return
      }
      setDrawMode('off')
      const deletedIndex = currentCrops.findIndex((crop) => crop.id === cropId)
      const nextIndex =
        deletedIndex < 0 ? 0 : Math.min(deletedIndex, Math.max(0, remaining.length - 1))
      setActiveCropIndex(nextIndex)
    },
    [inspectCrops, currentCrops, currentItem?.kind, deleteCrop, setDrawMode, setActiveCropIndex],
  )

  const discardActiveCrop = useCallback(() => {
    if (!activeCrop) return
    discardCrop(activeCrop.id)
  }, [activeCrop, discardCrop])

  const handleDrawnRect = useCallback(
    (rect: Parameters<typeof addCropToNews>[0]['rect']) => {
      if (!edition || !pdf || !currentItem) return
      const drawTarget = inspectItem ?? currentItem
      if (
        !inspectItem &&
        drawMode === 'redraw' &&
        activeCrop &&
        activeCrop.pageNumber === (currentPage?.pageNumber ?? currentItem.pageNumber)
      ) {
        updateCropRect(activeCrop.id, rect)
        setDrawMode('off')
        return
      }
      if (!drawTarget.newsId) {
        setDrawMode('off')
        return
      }
      const newsItem = getNewsItem(drawTarget.newsId)
      if (!newsItem) return
      addCropToNews({
        editionId: edition.id,
        pdfId: pdf.id,
        pageNumber: currentPage?.pageNumber ?? drawTarget.pageNumber,
        rect,
        newsItem,
      })
      setDrawMode('off')
      if (!inspectItem) setActiveCropIndex(currentCrops.length)
    },
    [
      edition,
      pdf,
      currentItem,
      inspectItem,
      drawMode,
      activeCrop,
      updateCropRect,
      setDrawMode,
      getNewsItem,
      addCropToNews,
      currentCrops.length,
      setActiveCropIndex,
      currentPage?.pageNumber,
    ],
  )

  const needsCrop =
    currentItem?.kind === 'news' && currentCrops.length === 0 && drawMode === 'off'

  return {
    edition,
    pdf,
    currentPage,
    queue: listItems,
    currentItem,
    currentCrops,
    activeCrop,
    inspectItem,
    inspectCrops,
    inspectCrop,
    pageCrops,
    approvedCropIds,
    mergeCandidate,
    canAttach: canAttachNews(currentItem, inspectItem),
    statuses,
    clientOnly,
    drawMode,
    needsCrop,
    progress,
    pageStats,
    selectedPageNumber,
    isLoadingNews,
    canUndo: undoStack.length > 0,
    workMode,
    goTo,
    setWorkMode,
    viewPage,
    inspectNews,
    clearInspect,
    attachInspected,
    next: () => step(1),
    prev: () => step(-1),
    approve,
    reject,
    rejectItem,
    undo,
    toggleClientOnly,
    setDrawMode,
    cycleCrop,
    selectCrop,
    mergeSuggested,
    splitActive,
    discardActiveCrop,
    discardCrop,
    handleDrawnRect,
    updateCropRect,
    ungroupRelatedCrop,
    editRelatedCrop: selectCrop,
  }
}
