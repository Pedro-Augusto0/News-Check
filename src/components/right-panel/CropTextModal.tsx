import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal/modal'
import { useCropsStore } from '@/stores/cropsStore'
import { useNewsStore } from '@/stores/newsStore'
import { useSessionStore } from '@/stores/sessionStore'
import { useCropDisplayIndexMap, useCropDisplayTree } from '@/hooks/useCropSelectors'
import { extractAndSaveModalText } from '@/services/cropTextExtraction'
import { buildClientKeywordRows } from '@/utils/newsDetailClients'
import { mergeClientKeywords, newsDisplayNodeHasClient } from '@/utils/cropClientStats'
import { buildCropsByPageSections } from '@/utils/cropDisplayTree'
import { buildNewsPageSections, isNewsItemPending, newsItemHasClient } from '@/utils/pendingNews'
import { NewsDetailCropEditor } from './NewsDetailCropEditor'
import { NewsDetailInfoPanel } from './NewsDetailInfoPanel'
import './crop-text-modal.css'

function formatEditionDate(value: string): string {
  const dateOnly = value.slice(0, 10)
  const parsed = new Date(`${dateOnly}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

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
  const openNewsTextModal = useNewsStore((s) => s.openNewsTextModal)
  const newsItems = useNewsStore((s) => s.items)
  const getNewsItem = useNewsStore((s) => s.getNewsItem)
  const editions = useSessionStore((s) => s.editions)
  const newsViewFilter = useSessionStore((s) => s.newsViewFilter)
  const [lastTextUpdate, setLastTextUpdate] = useState<Date | null>(null)

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

  const displayTree = useCropDisplayTree(editionId, pdfId)
  const cropDisplayIndex = useCropDisplayIndexMap(editionId, pdfId)

  const pageSections = useMemo(() => {
    if (!editionId || !pdfId) return []
    const pdfNews = Object.values(newsItems).filter((item) => item.pdfId === pdfId)
    const cropSections = buildCropsByPageSections(displayTree, pdfNews)
    return buildNewsPageSections(cropSections, pdfNews, pdfId, crops)
  }, [editionId, pdfId, newsItems, displayTree, crops])

  const newsItemIds = useMemo(() => {
    return pageSections.flatMap((section) =>
      section.entries
        .filter((entry) => {
          if (newsViewFilter !== 'withClient') return true
          if (entry.kind === 'pending') return newsItemHasClient(entry.item)
          return newsDisplayNodeHasClient(entry.node, crops)
        })
        .map((entry) => {
          if (entry.kind === 'pending') return entry.item.id
          return entry.node.group?.id ?? entry.node.crop?.id ?? null
        })
        .filter((id): id is string => !!id),
    )
  }, [pageSections, newsViewFilter, crops])

  const activeModalId = textModalNewsId ?? textModalCropId
  const currentNewsIndex = activeModalId ? newsItemIds.indexOf(activeModalId) : -1
  const hasPrev = currentNewsIndex > 0
  const hasNext = currentNewsIndex >= 0 && currentNewsIndex < newsItemIds.length - 1

  const isPendingModalId = useCallback(
    (id: string) => {
      const item = getNewsItem(id)
      if (!item || !pdfId) return false
      return isNewsItemPending(item, crops, pdfId)
    },
    [getNewsItem, crops, pdfId],
  )

  const goToPrev = useCallback(() => {
    if (!hasPrev) return
    const targetId = newsItemIds[currentNewsIndex - 1]
    if (isPendingModalId(targetId)) {
      openNewsTextModal(targetId)
      return
    }
    openTextModal(targetId)
  }, [hasPrev, currentNewsIndex, newsItemIds, openTextModal, openNewsTextModal, isPendingModalId])

  const goToNext = useCallback(() => {
    if (!hasNext) return
    const targetId = newsItemIds[currentNewsIndex + 1]
    if (isPendingModalId(targetId)) {
      openNewsTextModal(targetId)
      return
    }
    openTextModal(targetId)
  }, [hasNext, currentNewsIndex, newsItemIds, openTextModal, openNewsTextModal, isPendingModalId])

  const handleClose = useCallback(() => {
    closeTextModal()
    closeNewsTextModal()
  }, [closeTextModal, closeNewsTextModal])

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

  const totalNews = newsItemIds.length
  const positionLabel =
    currentNewsIndex >= 0 && totalNews > 0
      ? `${currentNewsIndex + 1} de ${totalNews} notícias`
      : '1 notícia'

  const sourceLabel = edition
    ? `${edition.vehicleName} - ${formatEditionDate(edition.editionDate)} - Página ${pageLabel}`
    : `Página ${pageLabel}`

  return (
    <Modal open hideHeader size="fullscreen" onClose={handleClose}>
      <div className="news-detail-modal">
        <header className="news-detail-modal__topbar">
          <div className="news-detail-modal__topbar-start">
            <button
              type="button"
              className="news-detail-modal__back"
              onClick={handleClose}
            >
              <ArrowLeft size={16} strokeWidth={2.25} aria-hidden />
              Voltar para a lista
            </button>
          </div>

          <div className="news-detail-modal__topbar-center">
            <h1 className="news-detail-modal__headline">{title || 'Sem título'}</h1>
            <p className="news-detail-modal__source">{sourceLabel}</p>
          </div>

          <div className="news-detail-modal__topbar-end">
            <span className="news-detail-modal__pagination-label">{positionLabel}</span>
            <div className="news-detail-modal__nav-group">
              <button
                type="button"
                className="news-detail-modal__nav-btn"
                onClick={goToPrev}
                disabled={!hasPrev}
                aria-label="Notícia anterior"
              >
                <ChevronLeft size={16} strokeWidth={2.25} aria-hidden />
              </button>
              <button
                type="button"
                className="news-detail-modal__nav-btn"
                onClick={goToNext}
                disabled={!hasNext}
                aria-label="Próxima notícia"
              >
                <ChevronRight size={16} strokeWidth={2.25} aria-hidden />
              </button>
            </div>
            <button
              type="button"
              className="news-detail-modal__close"
              onClick={handleClose}
              aria-label="Fechar"
            >
              <X size={18} strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        </header>

        <div className="news-detail-modal__layout">
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
          />
        </div>

        <footer className="news-detail-modal__footer">
          <div className="news-detail-modal__footer-status">
            {lastTextUpdate ? (
              <>
                <CheckCircle2 size={15} aria-hidden />
                <span>Texto atualizado pelo OCR</span>
                <span className="news-detail-modal__footer-time">
                  Última atualização: {formatTime(lastTextUpdate)}
                </span>
              </>
            ) : (
              <span>O texto original é mantido. Use Passar OCR para extrair o texto dos cortes.</span>
            )}
          </div>
          <button type="button" className="news-detail-modal__save-btn" onClick={handleClose}>
            Salvar alterações
          </button>
        </footer>
      </div>
    </Modal>
  )
}
