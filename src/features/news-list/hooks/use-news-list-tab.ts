import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent } from 'react'
import { useSessionStore } from '@/features/edition-session'
import { useCropsStore } from '@/features/crops'
import { useCropDragState } from '@/features/crops/hooks'
import { useNewsStore } from '@/features/news'
import { useCurrentPdf } from '@/features/edition-session/hooks'
import { useNewsCropsViewModel } from '@/features/news/hooks'
import { isNewsItemPending, resolveNewsTargetCropId } from '@/features/news/view-model'
import { canDeleteNewsItem } from '@/features/news/model'
import { resolveNewsAccentColor } from '@/features/news/accent'
import {
  handleCropListSelection,
  handleNewsListSelection,
  isMultiSelectEvent,
  clearNewsHighlight,
} from '@/features/crop-news-linking'

export function useNewsListTab() {
  const selectedEditionId = useSessionStore((s) => s.selectedEditionId)
  const selectedPageNumber = useSessionStore((s) => s.selectedPageNumber)
  const selectPage = useSessionStore((s) => s.selectPage)
  const newsViewFilter = useSessionStore((s) => s.newsViewFilter)
  const currentPdf = useCurrentPdf()

  const crops = useCropsStore((s) => s.crops)
  const groups = useCropsStore((s) => s.groups)
  const selectedCropId = useCropsStore((s) => s.selectedCropId)
  const expandedGroups = useCropsStore((s) => s.expandedGroups)
  const mergeCrops = useCropsStore((s) => s.mergeCrops)
  const reorderGroupCrops = useCropsStore((s) => s.reorderGroupCrops)
  const ungroupCrop = useCropsStore((s) => s.ungroupCrop)
  const deleteCrop = useCropsStore((s) => s.deleteCrop)
  const updateCropTitle = useCropsStore((s) => s.updateCropTitle)
  const updateGroupTitle = useCropsStore((s) => s.updateGroupTitle)
  const toggleGroupExpanded = useCropsStore((s) => s.toggleGroupExpanded)
  const openTextModal = useCropsStore((s) => s.openTextModal)
  const openNewsTextModal = useNewsStore((s) => s.openNewsTextModal)
  const selectCrop = useCropsStore((s) => s.selectCrop)
  const isNewsItemFinalized = useCropsStore((s) => s.isNewsItemFinalized)

  const isLoadingNews = useNewsStore((s) => s.isLoadingNews)
  const selectedNewsItemId = useNewsStore((s) => s.selectedNewsItemId)
  const highlightedNewsByPage = useNewsStore((s) => s.highlightedNewsByPage)
  const selectNewsItem = useNewsStore((s) => s.selectNewsItem)
  const addManualNewsItem = useNewsStore((s) => s.addManualNewsItem)
  const deleteManualNewsItem = useNewsStore((s) => s.deleteManualNewsItem)
  const findNewsByCropId = useNewsStore((s) => s.findNewsByCropId)
  const getNewsItem = useNewsStore((s) => s.getNewsItem)

  const [search, setSearch] = useState('')
  const {
    dragId,
    dropTargetId,
    ungroupZoneActive,
    setDropTargetId,
    setUngroupZoneActive,
    resetDrag,
    handleDragStart,
    handleDragOver,
    readDraggedCropId,
  } = useCropDragState()
  const [bannerDropActive, setBannerDropActive] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const [collapsedPages, setCollapsedPages] = useState<Record<string, boolean>>({})
  const { cropDisplayIndex, filteredPageSections } = useNewsCropsViewModel({
    editionId: selectedEditionId,
    pdfId: currentPdf?.id,
    search,
    newsViewFilter,
  })

  const pageSectionKey = useCallback(
    (pageNumber: string) => `${currentPdf?.id ?? 'pdf'}:${pageNumber}`,
    [currentPdf?.id],
  )

  const isPageExpanded = useCallback(
    (pageNumber: string) => {
      if (search.trim()) return true
      const key = pageSectionKey(pageNumber)
      const collapsed = key in collapsedPages
        ? collapsedPages[key]
        : pageNumber !== selectedPageNumber
      return !collapsed
    },
    [collapsedPages, pageSectionKey, selectedPageNumber, search],
  )

  const togglePageSection = useCallback(
    (pageNumber: string) => {
      const key = pageSectionKey(pageNumber)
      setCollapsedPages((prev) => {
        const collapsed = key in prev ? prev[key] : pageNumber !== selectedPageNumber
        return { ...prev, [key]: !collapsed }
      })
    },
    [pageSectionKey, selectedPageNumber],
  )

  useEffect(() => {
    if (search.trim()) return
    setCollapsedPages({})
  }, [selectedPageNumber, currentPdf?.id, search])

  const dragSourceInGroup = dragId ? !!crops[dragId]?.groupId : false

  const selectedNewsItem = selectedNewsItemId ? getNewsItem(selectedNewsItemId) : undefined

  const activeNewsAccent = useMemo(() => {
    if (!selectedNewsItem) return undefined
    return resolveNewsAccentColor(selectedNewsItem)
  }, [selectedNewsItem])

  const activeNewsHasCrop = useMemo(() => {
    if (!selectedNewsItem) return false
    if (selectedNewsItem.cropId && crops[selectedNewsItem.cropId]) return true
    return Object.values(crops).some((crop) => crop.newsItemId === selectedNewsItem.id)
  }, [selectedNewsItem, crops])

  useEffect(() => {
    if (!selectedNewsItemId && !selectedCropId) return

    if (selectedCropId && isNewsItemFinalized(selectedCropId)) {
      selectCrop(null)
      selectNewsItem(null)
      return
    }

    if (selectedNewsItemId) {
      const item = getNewsItem(selectedNewsItemId)
      if (!item || !currentPdf) return
      const targetCropId = resolveNewsTargetCropId(item, crops, groups)
      if (targetCropId && isNewsItemFinalized(targetCropId)) {
        selectNewsItem(null)
        selectCrop(null)
      }
    }
  }, [
    selectedNewsItemId,
    selectedCropId,
    crops,
    groups,
    currentPdf,
    getNewsItem,
    isNewsItemFinalized,
    selectCrop,
    selectNewsItem,
  ])

  useEffect(() => {
    if (!selectedNewsItemId && !selectedCropId) return
    const frame = requestAnimationFrame(() => {
      listRef.current
        ?.querySelector('[data-active-news="true"]')
        ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(frame)
  }, [selectedNewsItemId, selectedCropId])

  const isCropLinkedToSelectedNews = useCallback(
    (cropId?: string, newsItemId?: string | null) => {
      if (!selectedNewsItemId) return false
      if (newsItemId === selectedNewsItemId) return true
      if (!cropId) return false
      return findNewsByCropId(cropId)?.id === selectedNewsItemId
    },
    [selectedNewsItemId, findNewsByCropId],
  )

  const handleSelectNews = useCallback(
    (newsId: string, pageNumber: string, event?: MouseEvent) => {
      const item = getNewsItem(newsId)
      const hasCrop =
        !!item &&
        !!currentPdf &&
        !isNewsItemPending(item, crops, currentPdf.id)

      selectPage(pageNumber)

      if (!hasCrop) {
        selectNewsItem(newsId)
        selectCrop(null)
        return
      }

      const multi = isMultiSelectEvent(event)
      handleNewsListSelection(newsId, multi, () => {
        selectNewsItem(newsId)
        selectCrop(null)
      }, currentPdf ? { pdfId: currentPdf.id, pageNumber } : undefined)
    },
    [getNewsItem, currentPdf, crops, selectPage, selectNewsItem, selectCrop],
  )

  const handleSelectCrop = useCallback(
    (cropId: string, event?: MouseEvent) => {
      const crop = crops[cropId]
      if (!crop) return
      selectPage(crop.pageNumber)
      handleCropListSelection(cropId, isMultiSelectEvent(event))
    },
    [crops, selectPage],
  )

  const handleDeleteNews = useCallback(
    (newsId: string) => {
      deleteManualNewsItem(newsId)
      selectCrop(null)
    },
    [deleteManualNewsItem, selectCrop],
  )

  const handleAddNews = useCallback(() => {
    if (!selectedEditionId || !currentPdf) return
    const newsId = addManualNewsItem({
      editionId: selectedEditionId,
      pdfId: currentPdf.id,
      pageNumber: selectedPageNumber,
    })
    selectCrop(null)
    selectNewsItem(newsId)
  }, [selectedEditionId, currentPdf, selectedPageNumber, addManualNewsItem, selectCrop, selectNewsItem])

  const handleDrop = useCallback(
    (e: DragEvent, targetId: string) => {
      e.preventDefault()
      e.stopPropagation()
      const sourceId = readDraggedCropId(e)
      if (sourceId && sourceId !== targetId) {
        const source = crops[sourceId]
        const target = crops[targetId]
        const sameGroup =
          source?.groupId && target?.groupId && source.groupId === target.groupId

        if (sameGroup) {
          reorderGroupCrops(source.groupId!, sourceId, targetId)
        } else {
          mergeCrops(sourceId, targetId)
        }
      }
      resetDrag()
      setBannerDropActive(false)
    },
    [readDraggedCropId, crops, reorderGroupCrops, mergeCrops, resetDrag],
  )

  const handleUngroupDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      const sourceId = readDraggedCropId(e)
      if (sourceId && crops[sourceId]?.groupId) ungroupCrop(sourceId)
      resetDrag()
      setBannerDropActive(false)
    },
    [readDraggedCropId, crops, ungroupCrop, resetDrag],
  )

  const handleDragEnd = useCallback(() => {
    resetDrag()
    setBannerDropActive(false)
  }, [resetDrag])

  const activeNewsTargetCropId = selectedNewsItem
    ? resolveNewsTargetCropId(selectedNewsItem, crops, groups)
    : null

  const canDropOnActiveBanner = useMemo(() => {
    if (!dragId || !activeNewsHasCrop || !activeNewsTargetCropId) return false
    if (dragId === activeNewsTargetCropId) return false
    const source = crops[dragId]
    const target = crops[activeNewsTargetCropId]
    if (!source || !target) return false
    if (source.groupId && target.groupId && source.groupId === target.groupId) return false
    return true
  }, [dragId, activeNewsHasCrop, activeNewsTargetCropId, crops])

  const handleBannerDragOver = useCallback(
    (e: DragEvent) => {
      if (!activeNewsHasCrop) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
    },
    [activeNewsHasCrop],
  )

  const handleBannerDragEnter = useCallback(
    (e: DragEvent) => {
      if (!activeNewsHasCrop) return
      e.preventDefault()
      setBannerDropActive(true)
    },
    [activeNewsHasCrop],
  )

  const handleBannerDragLeave = useCallback((e: DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setBannerDropActive(false)
    }
  }, [])

  const handleBannerDrop = useCallback(
    (e: DragEvent) => {
      setBannerDropActive(false)
      if (!activeNewsTargetCropId) {
        e.preventDefault()
        return
      }

      const sourceId = e.dataTransfer.getData('text/plain') || dragId
      const source = sourceId ? crops[sourceId] : undefined
      const target = crops[activeNewsTargetCropId]
      const sameGroup = !!(
        source?.groupId &&
        target?.groupId &&
        source.groupId === target.groupId
      )

      if (!sourceId || sourceId === activeNewsTargetCropId || sameGroup) {
        e.preventDefault()
        resetDrag()
        return
      }

      handleDrop(e, activeNewsTargetCropId)
    },
    [activeNewsTargetCropId, crops, dragId, handleDrop, resetDrag],
  )

  const resolvePageImageUrl = useCallback(
    (pageNumber: string | undefined) => {
      if (!pageNumber || !currentPdf) return undefined
      return currentPdf.pages.find((page) => page.pageNumber === pageNumber)?.imageUrl || undefined
    },
    [currentPdf],
  )

  const handleClearActiveNews = useCallback(() => {
    const item = selectedNewsItem
    selectNewsItem(null)
    selectCrop(null)
    if (item) clearNewsHighlight({ pdfId: item.pdfId, pageNumber: item.pageNumber })
    else clearNewsHighlight()
  }, [selectedNewsItem, selectNewsItem, selectCrop])

  return {
    currentPdf,
    isLoadingNews,
    search,
    setSearch,
    handleAddNews,
    selectedNewsItem,
    selectedNewsItemId,
    selectedCropId,
    selectedPageNumber,
    activeNewsHasCrop,
    activeNewsAccent,
    canDropOnActiveBanner,
    bannerDropActive,
    handleBannerDragOver,
    handleBannerDragEnter,
    handleBannerDragLeave,
    handleBannerDrop,
    handleClearActiveNews,
    handleDeleteNews,
    canDeleteSelectedNews: !!(selectedNewsItemId && canDeleteNewsItem(selectedNewsItem)),
    listRef,
    handleDragEnd,
    filteredPageSections,
    isPageExpanded,
    dragId,
    dropTargetId,
    expandedGroups,
    cropDisplayIndex,
    highlightedNewsByPage,
    isCropLinkedToSelectedNews,
    resolvePageImageUrl,
    findNewsByCropId,
    togglePageSection,
    setDropTargetId,
    toggleGroupExpanded,
    handleDragStart,
    handleDragOver,
    handleDrop,
    updateGroupTitle,
    updateCropTitle,
    openTextModal,
    handleSelectCrop,
    deleteCrop,
    ungroupCrop,
    handleSelectNews,
    openNewsTextModal,
    dragSourceInGroup,
    ungroupZoneActive,
    setUngroupZoneActive,
    handleUngroupDrop,
  }
}
