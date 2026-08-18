import { useCallback, useEffect, useMemo, useState } from 'react'
import { useCropsStore } from '@/features/crops'
import { useNewsStore } from '@/features/news'
import { useSessionStore } from '@/features/edition-session'
import { useNewsCropsViewModel } from '@/features/news/hooks'
import { extractAndSaveModalText } from '@/features/text-extraction'
import { buildClientKeywordRows } from '../client-keywords'
import { mergeClientKeywords } from '@/features/crops/client-stats'
import type { NewsDetailBrowseTarget } from '../news-detail-news-list'

export function useNewsDetailModal() {
  const textModalCropId = useCropsStore((s) => s.textModalCropId)
  const closeTextModal = useCropsStore((s) => s.closeTextModal)
  const openTextModal = useCropsStore((s) => s.openTextModal)
  const crops = useCropsStore((s) => s.crops)
  const groups = useCropsStore((s) => s.groups)
  const textModalNewsId = useNewsStore((s) => s.textModalNewsId)
  const closeNewsTextModal = useNewsStore((s) => s.closeNewsTextModal)
  const getNewsItem = useNewsStore((s) => s.getNewsItem)
  const editions = useSessionStore((s) => s.editions)
  const mergeCrops = useCropsStore((s) => s.mergeCrops)
  const [lastTextUpdate, setLastTextUpdate] = useState<Date | null>(null)
  const [listCollapsed, setListCollapsed] = useState(false)
  const [viewPageNumber, setViewPageNumber] = useState<string | null>(null)
  const [previewNewsId, setPreviewNewsId] = useState<string | null>(null)
  const [previewCropIds, setPreviewCropIds] = useState<string[]>([])

  const pendingNewsItem = textModalNewsId ? getNewsItem(textModalNewsId) : undefined
  const isPendingNewsModal = !!textModalNewsId && !textModalCropId

  const modalRootId = useMemo(() => {
    if (!textModalCropId) return null
    if (groups[textModalCropId]) return textModalCropId
    const crop = crops[textModalCropId]
    if (crop?.groupId && groups[crop.groupId]) return crop.groupId
    return textModalCropId
  }, [textModalCropId, crops, groups])

  useEffect(() => {
    if (!textModalCropId || !modalRootId || modalRootId === textModalCropId) return
    openTextModal(modalRootId)
  }, [textModalCropId, modalRootId, openTextModal])

  const isGroup = modalRootId ? !!groups[modalRootId] : false
  const group = modalRootId ? groups[modalRootId] : undefined
  const singleCrop =
    modalRootId && !isGroup ? crops[modalRootId] : undefined

  const modalCrops = useMemo(() => {
    if (!modalRootId) return []
    if (group) {
      return group.cropIds.map((id) => crops[id]).filter(Boolean)
    }
    const crop = crops[modalRootId]
    return crop ? [crop] : []
  }, [modalRootId, group, crops])

  const editionId = modalCrops[0]?.editionId ?? pendingNewsItem?.editionId
  const pdfId = modalCrops[0]?.pdfId ?? pendingNewsItem?.pdfId
  const edition = editions.find((e) => e.id === editionId)

  const currentNewsId = isPendingNewsModal
    ? pendingNewsItem?.id ?? null
    : (modalCrops[0]?.newsItemId ?? null)
  const pdf = edition?.pdfs.find((item) => item.id === pdfId)
  const { cropDisplayIndex, pageSections } = useNewsCropsViewModel({
    editionId,
    pdfId,
    pages: pdf?.pages,
    keepNewsId: currentNewsId,
  })
  const currentCropIds = useMemo(() => new Set(modalCrops.map((crop) => crop.id)), [modalCrops])

  const previewCrops = useMemo(
    () => previewCropIds.map((id) => crops[id]).filter(Boolean),
    [previewCropIds, crops],
  )

  const newsIdentity = isPendingNewsModal
    ? pendingNewsItem?.id ?? null
    : (modalCrops[0]?.newsItemId ?? modalRootId)

  useEffect(() => {
    setPreviewNewsId(null)
    setPreviewCropIds([])
    setViewPageNumber(modalCrops[0]?.pageNumber ?? pendingNewsItem?.pageNumber ?? null)
  }, [newsIdentity])

  const handleClose = useCallback(() => {
    closeTextModal()
    closeNewsTextModal()
  }, [closeTextModal, closeNewsTextModal])

  const handleSelectPage = useCallback((pageNumber: string) => {
    setViewPageNumber(pageNumber)
  }, [])

  const handleSelectNews = useCallback(
    (target: NewsDetailBrowseTarget) => {
      setViewPageNumber(target.pageNumber)
      const isCurrent =
        (target.newsId && target.newsId === currentNewsId) ||
        target.cropIds.some((id) => currentCropIds.has(id))
      if (isCurrent) {
        setPreviewNewsId(null)
        setPreviewCropIds([])
        return
      }
      setPreviewNewsId(target.newsId)
      setPreviewCropIds(target.cropIds)
    },
    [currentNewsId, currentCropIds],
  )

  const handleMergeCrop = useCallback(
    (sourceCropId: string) => {
      const targetCropId = modalCrops[0]?.id
      if (!targetCropId || sourceCropId === targetCropId) return
      if (currentCropIds.has(sourceCropId)) return

      const groupId = mergeCrops(sourceCropId, targetCropId)
      setPreviewNewsId(null)
      setPreviewCropIds([])
      if (groupId) {
        closeNewsTextModal()
        openTextModal(groupId)
      }
    },
    [modalCrops, currentCropIds, mergeCrops, closeNewsTextModal, openTextModal],
  )

  const resolvePdfUrl = useCallback(
    (crop: (typeof modalCrops)[number]) => {
      const ed = editions.find((e) => e.id === crop.editionId)
      const pdf = ed?.pdfs.find((p) => p.id === crop.pdfId)
      return pdf?.pages.find((p) => p.pageNumber === crop.pageNumber)?.imageUrl
    },
    [editions],
  )

  useEffect(() => {
    setLastTextUpdate(null)
  }, [textModalCropId, textModalNewsId])

  const handleRunOcr = useCallback(async () => {
    if (!textModalCropId || isPendingNewsModal || modalCrops.length === 0) return
    const state = useCropsStore.getState()
    if (state.isTextExtracting(textModalCropId)) return
    await extractAndSaveModalText(textModalCropId, modalCrops, resolvePdfUrl)
    setLastTextUpdate(new Date())
  }, [textModalCropId, isPendingNewsModal, modalCrops, resolvePdfUrl])

  const title = isPendingNewsModal
    ? pendingNewsItem?.title ?? ''
    : isGroup
      ? group?.title ?? ''
      : singleCrop?.title ?? ''

  const cropModalText = useCropsStore((s) => {
    const id = s.textModalCropId
    if (!id) return ''
    if (s.groups[id]) return s.getGroupText(id)
    return s.getCropText(id)
  })

  const linkedNewsText = modalCrops[0]?.newsItemId
    ? getNewsItem(modalCrops[0].newsItemId)?.text ?? ''
    : ''

  const text = isPendingNewsModal
    ? (pendingNewsItem?.text ?? '')
    : (cropModalText.trim() || linkedNewsText)

  const extracting = useCropsStore((s) =>
    textModalCropId ? !!s.extractingTextIds[textModalCropId] : false,
  )

  const clientRows = useMemo(() => {
    if (isPendingNewsModal && pendingNewsItem) {
      return buildClientKeywordRows(pendingNewsItem.clientKeywordsFound ?? [])
    }
    return buildClientKeywordRows(mergeClientKeywords(modalCrops))
  }, [isPendingNewsModal, pendingNewsItem, modalCrops])

  const pageLabel = useMemo(() => {
    const pages = [...new Set(modalCrops.map((crop) => crop.pageNumber))]
    if (pages.length === 0) return pendingNewsItem?.pageNumber ?? '—'
    if (pages.length === 1) return pages[0]
    return pages.join(', ')
  }, [modalCrops, pendingNewsItem?.pageNumber])

  return {
    isOpen: !!(textModalCropId || textModalNewsId),
    handleClose,
    lastTextUpdate,
    listCollapsed,
    setListCollapsed,
    title,
    text,
    extracting,
    modalCrops,
    isPendingNewsModal,
    handleRunOcr,
    clientRows,
    edition,
    pageLabel,
    modalRootId,
    pendingNewsItem,
    cropDisplayIndex,
    viewPageNumber,
    setViewPageNumber,
    previewCrops,
    pageSections,
    currentNewsId,
    currentCropIds,
    group,
    previewNewsId,
    previewCropIds,
    handleSelectPage,
    handleSelectNews,
    handleMergeCrop,
  }
}
