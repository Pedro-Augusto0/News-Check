import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCropsStore } from '@/features/crops'
import { canMergeCrops } from '@/features/crops/merge'
import { useNewsStore } from '@/features/news'
import { useCurrentEdition, useCurrentPdf, useSessionStore } from '@/features/edition-session'
import { useCurrentPage } from '@/features/page-navigation'
import { useNotificationStore } from '@/features/notifications'
import { setPublicationFinished, setPublicationPageFinished } from '@/features/publication-api'
import {
  extractAndReplaceNewsContent,
  resolveCropImageUrl,
} from '@/features/text-extraction/crop-text-extraction'
import {
  buildReviewPageStats,
  buildReviewQueue,
  canAttachNews,
  collectApprovedCropIds,
  cropBelongsOnViewedPage,
  filterActiveReviewItems,
  findMergeCandidate,
  firstPendingId,
  pageIdOf,
  rankQueueForReview,
  resolveCropPageId,
  resolveReviewItemClick,
  saveApprovedNews,
  commitDiscardNews,
  isCreationSessionLocked,
} from '../application'
import { useReviewQueueStore } from '../store'
import type { ReviewQueueItem, ReviewWorkMode } from '../model'

export interface ReviewCreationDraft {
  newsId: string
  itemId: string
  cropId: string | null
  imageUrl: string
  ocrStatus: 'idle' | 'running' | 'ready' | 'error'
  ocrError: string | null
}

export function useReviewSession() {
  const edition = useCurrentEdition()
  const pdf = useCurrentPdf()
  const currentPage = useCurrentPage()
  const selectPage = useSessionStore((state) => state.selectPage)
  const setPublicationPageFinishedState = useSessionStore(
    (state) => state.setPublicationPageFinished,
  )
  const setPublicationFinishedState = useSessionStore((state) => state.setPublicationFinished)
  const clearEditionSelection = useSessionStore((state) => state.clearEditionSelection)
  const selectedPageNumber = useSessionStore((state) => state.selectedPageNumber)

  const crops = useCropsStore((state) => state.crops)
  const groups = useCropsStore((state) => state.groups)
  const newsItems = useNewsStore((state) => state.items)
  const isLoadingNews = useNewsStore((state) => state.isLoadingNews)
  const getNewsItem = useNewsStore((state) => state.getNewsItem)
  const updateNewsItemTitle = useNewsStore((state) => state.updateNewsItemTitle)
  const updateNewsItemText = useNewsStore((state) => state.updateNewsItemText)
  const addManualNewsItem = useNewsStore((state) => state.addManualNewsItem)
  const deleteManualNewsItem = useNewsStore((state) => state.deleteManualNewsItem)
  const updateCropTitle = useCropsStore((state) => state.updateCropTitle)
  const updateCropText = useCropsStore((state) => state.updateCropText)
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
  const clearReviewEdition = useReviewQueueStore((state) => state.clearEdition)
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
  const markSaved = useReviewQueueStore((state) => state.markSaved)
  const clearStatus = useReviewQueueStore((state) => state.clearStatus)
  const savedIds = useReviewQueueStore((state) => state.savedIds)
  const setClientOnly = useReviewQueueStore((state) => state.setClientOnly)
  const toggleClientOnly = useReviewQueueStore((state) => state.toggleClientOnly)
  const undo = useReviewQueueStore((state) => state.undo)
  const undoStack = useReviewQueueStore((state) => state.undoStack)
  const [creationDraft, setCreationDraft] = useState<ReviewCreationDraft | null>(null)
  const [newsOcr, setNewsOcr] = useState<{
    itemId: string
    status: 'running' | 'ready' | 'error'
    error: string | null
  } | null>(null)
  const ocrInFlightRef = useRef<{ itemId: string; promise: Promise<void> } | null>(null)

  useEffect(() => {
    if (edition?.id) {
      hydrateEdition(edition.id)
      return
    }
    clearReviewEdition()
  }, [edition?.id, hydrateEdition, clearReviewEdition])

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
  const newsPageId = currentItem ? pageIdOf(currentItem) : undefined
  const inspectItemId = inspectItem?.id ?? null
  const inspectPageId = inspectItem ? pageIdOf(inspectItem) : undefined

  useEffect(() => {
    if (!inspectItemId || !inspectPageId) return
    selectPage(inspectPageId)
  }, [inspectItemId, inspectPageId, selectPage])

  // Follow the active news page only when that news changes.
  // Clearing inspect (e.g. after attach) must not snap back to news 1.
  useEffect(() => {
    if (!currentNewsKey || !newsPageId) return
    if (skipPageFollowRef.current) {
      skipPageFollowRef.current = false
      return
    }
    selectPage(newsPageId)
  }, [currentNewsKey, newsPageId, selectPage])

  const viewPage = useCallback(
    (pageIdOrNumber: string) => {
      selectPage(pageIdOrNumber)
    },
    [selectPage],
  )

  const pageCrops = useMemo(() => {
    if (!pdf || !currentPage) return []
    return Object.values(crops).filter((crop) =>
      cropBelongsOnViewedPage({
        crop,
        pdfId: pdf.id,
        page: currentPage,
        newsItems,
      }),
    )
  }, [crops, pdf, currentPage, newsItems])

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
  const [finishingPage, setFinishingPage] = useState(false)
  const [finishingPublication, setFinishingPublication] = useState(false)
  const savingItemIdsRef = useRef(new Set<string>())
  const skipPageFollowRef = useRef(false)

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
    return buildReviewPageStats({ pages: pdf.pages, queue, statuses })
  }, [pdf, queue, statuses])

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
    (id: string, cropId?: string) => {
      if (resolveReviewItemClick(workMode, currentId, id) === 'preview') {
        inspectNews(id, cropId)
        return
      }
      const item = queue.find((entry) => entry.id === id)
      const cropIndex = cropId && item ? item.cropIds.indexOf(cropId) : 0
      setInspectId(null)
      setCurrentId(id)
      setActiveCropIndex(cropIndex >= 0 ? cropIndex : 0)
    },
    [workMode, currentId, inspectNews, queue, setCurrentId, setInspectId, setActiveCropIndex],
  )

  const setWorkMode = useCallback(
    (mode: ReviewWorkMode) => {
      setWorkModeStore(mode)
    },
    [setWorkModeStore],
  )

  const addSegment = useCallback(() => {
    if (workMode === 'focus') return
    if (currentItem?.kind !== 'news' || !currentItem.newsId) return
    setWorkModeStore('focus')
  }, [workMode, currentItem, setWorkModeStore])

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

  const approveNewsItem = useCallback(
    async (item: ReviewQueueItem) => {
      const status = statuses[item.id]
      if (status === 'approved' || status === 'rejected') return false

      let savedToApi = false
      if (edition && pdf && !savedIds[item.id]) {
        if (savingItemIdsRef.current.has(item.id)) return false
        savingItemIdsRef.current.add(item.id)
        try {
          const saved = await saveApprovedNews({
            item,
            crops,
            newsItems,
            edition,
            pages: pdf.pages,
          })
          if (saved) {
            markSaved(item.id)
            savedToApi = true
          }
        } catch (error) {
          useNotificationStore.getState().show(
            error instanceof Error ? error.message : 'Erro ao gravar notícia no servidor',
            { tone: 'error' },
          )
          return false
        } finally {
          savingItemIdsRef.current.delete(item.id)
        }
      }

      markStatus(item.id, 'approved')
      useNotificationStore.getState().show(
        savedToApi ? 'Notícia finalizada e gravada com sucesso' : 'Notícia finalizada',
        { tone: 'success' },
      )
      if (workMode === 'focus') setWorkModeStore('free')
      skipPageFollowRef.current = true
      if (currentId === item.id) advanceAfter(item.id)
      return true
    },
    [
      statuses,
      edition,
      pdf,
      savedIds,
      crops,
      newsItems,
      markSaved,
      markStatus,
      workMode,
      setWorkModeStore,
      currentId,
      advanceAfter,
    ],
  )

  const approve = useCallback(() => {
    if (currentItem) void approveNewsItem(currentItem)
  }, [currentItem, approveNewsItem])

  const approveItem = useCallback(
    async (itemId: string, content?: { title?: string; text?: string }) => {
      const item = queue.find((entry) => entry.id === itemId)
      if (!item) return false
      return approveNewsItem({ ...item, ...content })
    },
    [queue, approveNewsItem],
  )

  const rejectNewsItem = useCallback(
    (item: ReviewQueueItem) => {
      const status = statuses[item.id]
      if (status === 'approved' || status === 'rejected') return

      markStatus(item.id, 'rejected')

      useNotificationStore.getState().show('Notícia descartada', {
        durationMs: 4000,
        tone: 'info',
        action: {
          label: 'Reverter',
          onClick: () => {
            clearStatus(item.id)
          },
        },
        onExpire: () => {
          void commitDiscardNews(item, newsItems).catch((error) => {
            useNotificationStore.getState().show(
              error instanceof Error ? error.message : 'Erro ao descartar notícia no servidor',
              { tone: 'error' },
            )
          })
        },
      })

      if (inspectId === item.id) setInspectId(null)
      if (currentId === item.id) {
        skipPageFollowRef.current = true
        advanceAfter(item.id)
      }
    },
    [
      statuses,
      markStatus,
      newsItems,
      clearStatus,
      inspectId,
      setInspectId,
      currentId,
      advanceAfter,
    ],
  )

  const reject = useCallback(() => {
    if (currentItem) rejectNewsItem(currentItem)
  }, [currentItem, rejectNewsItem])

  const rejectItem = useCallback(
    (itemId: string) => {
      const item = queue.find((entry) => entry.id === itemId)
      if (!item) return
      rejectNewsItem(item)
    },
    [queue, rejectNewsItem],
  )

  const cycleCrop = useCallback(() => {
    if (currentCrops.length <= 1) return
    const nextIndex = (activeCropIndex + 1) % currentCrops.length
    const nextCrop = currentCrops[nextIndex]
    setActiveCropIndex(nextIndex)
    if (nextCrop && nextCrop.pageNumber !== currentPage?.pageNumber) {
      selectPage(
        resolveCropPageId(
          nextCrop,
          pdf?.pages,
          nextCrop.newsItemId ? newsItems[nextCrop.newsItemId] : undefined,
        ),
      )
    }
  }, [currentCrops, activeCropIndex, setActiveCropIndex, currentPage, selectPage, pdf?.pages, newsItems])

  const selectCrop = useCallback(
    (cropId: string) => {
      const currentIndex = currentCrops.findIndex((crop) => crop.id === cropId)
      if (currentIndex >= 0) {
        setActiveCropIndex(currentIndex)
        const crop = currentCrops[currentIndex]
        if (crop && crop.pageNumber !== currentPage?.pageNumber) {
          selectPage(
            resolveCropPageId(
              crop,
              pdf?.pages,
              crop.newsItemId ? newsItems[crop.newsItemId] : undefined,
            ),
          )
        }
        return
      }
      const owner = listItems.find((item) => item.cropIds.includes(cropId))
      if (owner) goTo(owner.id, cropId)
    },
    [currentCrops, setActiveCropIndex, currentPage, selectPage, listItems, goTo, pdf?.pages, newsItems],
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

  const startNewsCreation = useCallback(() => {
    if (!edition || !pdf || !currentPage?.imageUrl) return
    if (isCreationSessionLocked(creationDraft)) return
    const newsId = addManualNewsItem({
      editionId: edition.id,
      pdfId: pdf.id,
      pageNumber: currentPage.pageNumber,
      filePath: currentPage.filePath,
      section: currentPage.section,
      title: 'Nova notícia',
    })
    const itemId = `news:${newsId}`
    setCreationDraft({
      newsId,
      itemId,
      cropId: null,
      imageUrl: currentPage.imageUrl,
      ocrStatus: 'idle',
      ocrError: null,
    })
    setInspectId(null)
    setClientOnly(false)
    setCurrentId(itemId)
    setDrawMode('add')
  }, [
    edition,
    pdf,
    currentPage,
    creationDraft,
    addManualNewsItem,
    setInspectId,
    setClientOnly,
    setCurrentId,
    setDrawMode,
  ])

  const runNewsOcr = useCallback(
    async (item: ReviewQueueItem) => {
      if (!edition) throw new Error('Edição indisponível')
      const inFlight = ocrInFlightRef.current
      if (inFlight?.itemId === item.id) return inFlight.promise

      const itemCrops = item.cropIds
        .map((id) => useCropsStore.getState().crops[id])
        .filter(Boolean)
      if (itemCrops.length === 0) {
        throw new Error('Adicione um recorte para passar OCR')
      }

      const promise = (async () => {
        setNewsOcr({ itemId: item.id, status: 'running', error: null })
        setCreationDraft((draft) =>
          draft?.itemId === item.id ? { ...draft, ocrStatus: 'running', ocrError: null } : draft,
        )
        try {
          await extractAndReplaceNewsContent(itemCrops, (crop) =>
            resolveCropImageUrl(crop, [edition]),
          )
          setNewsOcr({ itemId: item.id, status: 'ready', error: null })
          setCreationDraft((draft) =>
            draft?.itemId === item.id ? { ...draft, ocrStatus: 'ready', ocrError: null } : draft,
          )
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Não foi possível executar o OCR'
          setNewsOcr({ itemId: item.id, status: 'error', error: message })
          setCreationDraft((draft) =>
            draft?.itemId === item.id
              ? { ...draft, ocrStatus: 'error', ocrError: message }
              : draft,
          )
          throw error
        }
      })()

      ocrInFlightRef.current = { itemId: item.id, promise }
      try {
        await promise
      } finally {
        if (ocrInFlightRef.current?.promise === promise) ocrInFlightRef.current = null
      }
    },
    [edition],
  )

  const discardCreationDraft = useCallback(() => {
    if (!creationDraft) return
    if (creationDraft.cropId) deleteCrop(creationDraft.cropId)
    deleteManualNewsItem(creationDraft.newsId)
    clearStatus(creationDraft.itemId)
    setCreationDraft(null)
    setDrawMode('off')
    setCurrentId(null)
  }, [
    creationDraft,
    deleteCrop,
    deleteManualNewsItem,
    clearStatus,
    setDrawMode,
    setCurrentId,
  ])

  const finishCreationDraft = useCallback(() => {
    setCreationDraft(null)
    setDrawMode('off')
  }, [setDrawMode])

  const togglePageFinished = useCallback(async () => {
    if (!edition || !currentPage?.publicationPageId || finishingPage) return
    const nextFinished = !currentPage.finished
    setFinishingPage(true)
    try {
      await setPublicationPageFinished(currentPage.publicationPageId, nextFinished)
      setPublicationPageFinishedState(edition.id, currentPage.publicationPageId, nextFinished)
      useNotificationStore.getState().show(
        nextFinished ? 'Página finalizada' : 'Página reaberta',
        { tone: 'success' },
      )
    } catch (error) {
      useNotificationStore.getState().show(
        error instanceof Error ? error.message : 'Erro ao atualizar a página no servidor',
        { tone: 'error' },
      )
    } finally {
      setFinishingPage(false)
    }
  }, [
    edition,
    currentPage?.publicationPageId,
    currentPage?.finished,
    finishingPage,
    setPublicationPageFinishedState,
  ])

  const publicationId = Number(edition?.id)
  const canFinishPublication = Number.isInteger(publicationId) && publicationId > 0

  const finishPublication = useCallback(async () => {
    if (!edition || !canFinishPublication || finishingPublication || edition.finished) return false
    setFinishingPublication(true)
    try {
      await setPublicationFinished(publicationId, true)
      setPublicationFinishedState(edition.id, true)
      useCropsStore.getState().clearHydratedEdition()
      useNewsStore.getState().clearHydratedEdition()
      clearReviewEdition()
      setCreationDraft(null)
      setNewsOcr(null)
      ocrInFlightRef.current = null
      clearEditionSelection()
      useNotificationStore.getState().show('Jornal finalizado', { tone: 'success' })
      return true
    } catch (error) {
      useNotificationStore.getState().show(
        error instanceof Error ? error.message : 'Erro ao atualizar o jornal no servidor',
        { tone: 'error' },
      )
      return false
    } finally {
      setFinishingPublication(false)
    }
  }, [
    edition,
    canFinishPublication,
    publicationId,
    finishingPublication,
    setPublicationFinishedState,
    clearEditionSelection,
    clearReviewEdition,
  ])

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
      const cropId = addCropToNews({
        editionId: edition.id,
        pdfId: pdf.id,
        pageNumber: currentPage?.pageNumber ?? drawTarget.pageNumber,
        rect,
        newsItem,
      })
      setDrawMode('off')
      setCreationDraft((draft) => {
        if (!draft || draft.newsId !== drawTarget.newsId || !cropId) return draft
        return { ...draft, cropId }
      })
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
    currentItem?.kind === 'news' && currentCrops.length === 0 && drawMode !== 'redraw'

  const updateItemContent = useCallback(
    (item: ReviewQueueItem, next: { title?: string; text?: string }) => {
      if (item.newsId) {
        if (next.title !== undefined) updateNewsItemTitle(item.newsId, next.title)
        if (next.text !== undefined) updateNewsItemText(item.newsId, next.text)
        return
      }
      const cropId = item.cropIds[0]
      if (!cropId) return
      if (next.title !== undefined) updateCropTitle(cropId, next.title)
      if (next.text !== undefined) updateCropText(cropId, next.text)
    },
    [updateNewsItemTitle, updateNewsItemText, updateCropTitle, updateCropText],
  )

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
    creationDraft,
    newsOcr,
    canStartNewsCreation:
      !!edition && !!pdf && !!currentPage?.imageUrl && !isCreationSessionLocked(creationDraft),
    progress,
    pageStats,
    selectedPageNumber,
    isLoadingNews,
    canUndo: undoStack.length > 0,
    workMode,
    canFinishPage: currentPage?.publicationPageId != null,
    pageFinished: !!currentPage?.finished,
    finishingPage,
    togglePageFinished,
    canFinishPublication,
    publicationFinished: !!edition?.finished,
    finishingPublication,
    finishPublication,
    goTo,
    setWorkMode,
    addSegment,
    viewPage,
    inspectNews,
    clearInspect,
    attachInspected,
    next: () => step(1),
    prev: () => step(-1),
    approve,
    approveItem,
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
    updateItemContent,
    startNewsCreation,
    runNewsOcr,
    discardCreationDraft,
    finishCreationDraft,
  }
}
