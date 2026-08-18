import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  X,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal/modal'
import { useCropsStore } from '@/stores/cropsStore'
import { useNewsStore } from '@/stores/newsStore'
import { useSessionStore } from '@/stores/sessionStore'
import { useCropDisplayIndexMap, useCropDisplayTree } from '@/hooks/useCropSelectors'
import { extractAndSaveModalText } from '@/services/cropTextExtraction'
import { buildClientKeywordRows } from '@/utils/newsDetailClients'
import { mergeClientKeywords } from '@/utils/cropClientStats'
import { buildCropsByPageSections } from '@/utils/cropDisplayTree'
import { buildNewsPageSections, excludeFinalizedNewsSections } from '@/utils/pendingNews'
import { comparePageKeys } from '@/utils/pageKey'
import { cn } from '@/utils/cn'
import { NewsDetailCropEditor } from './NewsDetailCropEditor'
import { NewsDetailInfoPanel } from './NewsDetailInfoPanel'
import { NewsDetailNewsList, type NewsDetailBrowseTarget } from './NewsDetailNewsList'
import './crop-text-modal.css'

function formatTime(value: Date): string {
  return value.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function CropTextModal() {
  const textModalCropId = useCropsStore((s) => s.textModalCropId)
  const closeTextModal = useCropsStore((s) => s.closeTextModal)
  const openTextModal = useCropsStore((s) => s.openTextModal)
  const crops = useCropsStore((s) => s.crops)
  const groups = useCropsStore((s) => s.groups)
  const textModalNewsId = useNewsStore((s) => s.textModalNewsId)
  const closeNewsTextModal = useNewsStore((s) => s.closeNewsTextModal)
  const getNewsItem = useNewsStore((s) => s.getNewsItem)
  const editions = useSessionStore((s) => s.editions)
  const newsItems = useNewsStore((s) => s.items)
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

  const cropDisplayIndex = useCropDisplayIndexMap(editionId, pdfId)
  const displayTree = useCropDisplayTree(editionId, pdfId)
  const currentNewsId = isPendingNewsModal
    ? pendingNewsItem?.id ?? null
    : (modalCrops[0]?.newsItemId ?? null)
  const currentCropIds = useMemo(() => new Set(modalCrops.map((crop) => crop.id)), [modalCrops])

  const pageSections = useMemo(() => {
    if (!editionId || !pdfId) return []
    const pdfNews = Object.values(newsItems).filter((item) => item.pdfId === pdfId)
    const cropSections = buildCropsByPageSections(displayTree, pdfNews)
    const newsSections = excludeFinalizedNewsSections(
      buildNewsPageSections(cropSections, pdfNews, pdfId, crops),
      crops,
      groups,
      currentNewsId ? { keepNewsIds: [currentNewsId] } : undefined,
    )
    const pdf = edition?.pdfs.find((item) => item.id === pdfId)
    const pages = pdf?.pages ?? []
    if (pages.length === 0) return newsSections

    const byPage = new Map(newsSections.map((section) => [section.pageNumber, section]))
    return [...pages]
      .sort((a, b) => comparePageKeys(a.pageNumber, b.pageNumber))
      .map((page) => byPage.get(page.pageNumber) ?? { pageNumber: page.pageNumber, entries: [] })
  }, [editionId, pdfId, newsItems, displayTree, crops, groups, edition, currentNewsId])

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

  if (!textModalCropId && !textModalNewsId) return null
  return (
    <Modal open hideHeader size="fullscreen" onClose={handleClose}>
      <div className="news-detail-modal">
        <header className="news-detail-modal__topbar">
          <button
            type="button"
            className="news-detail-modal__back"
            onClick={handleClose}
          >
            <ArrowLeft size={15} strokeWidth={2.25} aria-hidden />
            Voltar
          </button>

          <div className="news-detail-modal__topbar-end">
            {lastTextUpdate && (
              <div className="news-detail-modal__footer-status">
                <CheckCircle2 size={14} aria-hidden />
                <span>OCR atualizado {formatTime(lastTextUpdate)}</span>
              </div>
            )}
            <button type="button" className="news-detail-modal__save-btn" onClick={handleClose}>
              Salvar
            </button>
            <button
              type="button"
              className="news-detail-modal__close"
              onClick={handleClose}
              aria-label="Fechar"
            >
              <X size={16} strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        </header>

        <div
          className={cn(
            'news-detail-modal__layout',
            listCollapsed && 'news-detail-modal__layout--list-collapsed',
          )}
        >
          <NewsDetailInfoPanel
            title={title}
            text={text}
            extracting={extracting}
            canRunOcr={modalCrops.length > 0 && !isPendingNewsModal}
            onRunOcr={() => void handleRunOcr()}
            clientRows={clientRows}
            metadata={{
              vehicleName: edition?.vehicleName ?? '',
              editionDate: edition?.editionDate ?? '',
              pageLabel,
            }}
          />

          <NewsDetailCropEditor
            modalCrops={modalCrops}
            modalRootId={modalRootId}
            pendingNewsItem={isPendingNewsModal ? pendingNewsItem : undefined}
            cropDisplayIndex={cropDisplayIndex}
            viewPageNumber={viewPageNumber}
            onViewPage={setViewPageNumber}
            previewCrops={previewCrops}
          />

          <NewsDetailNewsList
            sections={pageSections}
            currentNewsId={currentNewsId}
            currentCropIds={currentCropIds}
            currentGroupId={group?.id ?? null}
            previewNewsId={previewNewsId}
            previewCropIds={previewCropIds}
            viewPageNumber={viewPageNumber}
            collapsed={listCollapsed}
            canMerge={modalCrops.length > 0}
            cropDisplayIndex={cropDisplayIndex}
            onToggleCollapsed={() => setListCollapsed((value) => !value)}
            onSelectPage={handleSelectPage}
            onSelectNews={handleSelectNews}
            onMergeCrop={handleMergeCrop}
          />
        </div>
      </div>
    </Modal>
  )
}
