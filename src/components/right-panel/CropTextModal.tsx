import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal/modal'
import { useCropsStore } from '@/stores/cropsStore'
import { useSessionStore } from '@/stores/sessionStore'
import { useCropDisplayIndexMap, useCropDisplayTree } from '@/hooks/useCropSelectors'
import { extractAndSaveModalText } from '@/services/cropTextExtraction'
import { buildClientKeywordRows } from '@/utils/newsDetailClients'
import { mergeClientKeywords } from '@/utils/cropClientStats'
import { cn } from '@/utils/cn'
import { cropColor } from '@/utils/cropColors'
import type { Crop } from '@/types/session'
import { ClippingLightbox, DETAIL_THUMBNAIL_WIDTH_LARGE, NewsClippingThumbnail } from './NewsClippingThumbnail'
import './crop-text-modal.css'

interface CropPreviewItem {
  crop: Crop
  pdfUrl: string
}

function splitTextParagraphs(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  return trimmed.split(/\n{2,}/).map((p) => p.replace(/\n/g, ' ').trim())
}

export function CropTextModal() {
  const textModalCropId = useCropsStore((s) => s.textModalCropId)
  const closeTextModal = useCropsStore((s) => s.closeTextModal)
  const openTextModal = useCropsStore((s) => s.openTextModal)
  const crops = useCropsStore((s) => s.crops)
  const groups = useCropsStore((s) => s.groups)
  const editions = useSessionStore((s) => s.editions)
  const newsViewFilter = useSessionStore((s) => s.newsViewFilter)
  const autoExtractAttempted = useRef<string | null>(null)
  const [expandedCropId, setExpandedCropId] = useState<string | null>(null)

  const isGroup = textModalCropId ? !!groups[textModalCropId] : false
  const group = textModalCropId ? groups[textModalCropId] : undefined
  const singleCrop = textModalCropId && !isGroup ? crops[textModalCropId] : undefined

  const modalCrops = useMemo(() => {
    if (!textModalCropId) return []
    if (group) {
      return group.cropIds.map((id) => crops[id]).filter(Boolean)
    }
    const crop = crops[textModalCropId]
    return crop ? [crop] : []
  }, [textModalCropId, group, crops])

  const editionId = modalCrops[0]?.editionId
  const pdfId = modalCrops[0]?.pdfId

  const displayTree = useCropDisplayTree(editionId, pdfId)
  const cropDisplayIndex = useCropDisplayIndexMap(editionId, pdfId)

  const newsItemIds = useMemo(() => {
    return displayTree
      .filter((node) => {
        if (newsViewFilter !== 'withClient') return true
        const id = node.group?.id ?? node.crop?.id
        if (!id) return false
        const modalGroup = node.group
        if (modalGroup) {
          return modalGroup.cropIds.some(
            (cropId) => (crops[cropId]?.clientKeywordsFound?.length ?? 0) > 0,
          )
        }
        return (node.crop?.clientKeywordsFound?.length ?? 0) > 0
      })
      .map((node) => node.group?.id ?? node.crop?.id)
      .filter((id): id is string => !!id)
  }, [displayTree, newsViewFilter, crops])

  const currentNewsIndex = textModalCropId ? newsItemIds.indexOf(textModalCropId) : -1
  const hasPrev = currentNewsIndex > 0
  const hasNext = currentNewsIndex >= 0 && currentNewsIndex < newsItemIds.length - 1

  const goToPrev = useCallback(() => {
    if (!hasPrev) return
    openTextModal(newsItemIds[currentNewsIndex - 1])
  }, [hasPrev, currentNewsIndex, newsItemIds, openTextModal])

  const goToNext = useCallback(() => {
    if (!hasNext) return
    openTextModal(newsItemIds[currentNewsIndex + 1])
  }, [hasNext, currentNewsIndex, newsItemIds, openTextModal])

  const cropPreviews = useMemo((): CropPreviewItem[] => {
    const items: CropPreviewItem[] = []
    for (const crop of modalCrops) {
      const edition = editions.find((e) => e.id === crop.editionId)
      const pdf = edition?.pdfs.find((p) => p.id === crop.pdfId)
      if (pdf) items.push({ crop, pdfUrl: pdf.url })
    }
    return items
  }, [modalCrops, editions])

  const pdfUrl = cropPreviews[0]?.pdfUrl

  const resolvePdfUrl = useCallback(
    (crop: Crop) => {
      const edition = editions.find((e) => e.id === crop.editionId)
      return edition?.pdfs.find((p) => p.id === crop.pdfId)?.url
    },
    [editions],
  )

  useEffect(() => {
    setExpandedCropId(null)
  }, [textModalCropId])

  useEffect(() => {
    if (!textModalCropId) {
      autoExtractAttempted.current = null
      return
    }

    if (autoExtractAttempted.current === textModalCropId) return
    autoExtractAttempted.current = textModalCropId

    const state = useCropsStore.getState()
    const text = state.getModalText()
    if (text.trim() || modalCrops.length === 0 || state.isTextExtracting(textModalCropId)) return

    void extractAndSaveModalText(textModalCropId, modalCrops, resolvePdfUrl)
  }, [textModalCropId, modalCrops, resolvePdfUrl])

  const title = isGroup ? group?.title ?? '' : singleCrop?.title ?? ''

  const text = useCropsStore((s) => {
    const id = s.textModalCropId
    if (!id) return ''
    if (s.groups[id]) return s.getGroupText(id)
    return s.getCropText(id)
  })

  const extracting = useCropsStore((s) =>
    textModalCropId ? !!s.extractingTextIds[textModalCropId] : false,
  )

  const clientRows = useMemo(
    () => buildClientKeywordRows(mergeClientKeywords(modalCrops)),
    [modalCrops],
  )

  const paragraphs = useMemo(() => splitTextParagraphs(text), [text])

  const expandedPreview = useMemo(() => {
    if (!expandedCropId) return null
    return cropPreviews.find((preview) => preview.crop.id === expandedCropId) ?? null
  }, [expandedCropId, cropPreviews])

  if (!textModalCropId) return null

  const totalNews = newsItemIds.length
  const positionLabel =
    currentNewsIndex >= 0 && totalNews > 0
      ? `${currentNewsIndex + 1} de ${totalNews} notícias`
      : '1 notícia'

  return (
    <Modal open hideHeader size="fullscreen" onClose={closeTextModal}>
      <div className="news-detail-modal">
        <header className="news-detail-modal__topbar">
          <button
            type="button"
            className="news-detail-modal__back"
            onClick={closeTextModal}
          >
            <ArrowLeft size={16} strokeWidth={2.25} aria-hidden />
            Voltar para a lista
          </button>

          <div className="news-detail-modal__pagination">
            <span className="news-detail-modal__pagination-label">{positionLabel}</span>
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
        </header>

        <div className="news-detail-modal__layout">
          <article className="news-detail-modal__article-card">
            <section className="news-detail-modal__section news-detail-modal__section--title">
              <h3 className="news-detail-modal__section-label">Título</h3>
              <h1 className="news-detail-modal__title">{title || 'Sem título'}</h1>
            </section>

            <div className="news-detail-modal__divider" role="separator" />

            <section className="news-detail-modal__section news-detail-modal__section--text">
              <h3 className="news-detail-modal__section-label">Texto</h3>
              {extracting ? (
                <p className="news-detail-modal__extracting">
                  <RefreshCw size={14} className="news-detail-modal__spin" aria-hidden />
                  Extraindo texto da notícia…
                </p>
              ) : paragraphs.length > 0 ? (
                <div className="news-detail-modal__text">
                  {paragraphs.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              ) : (
                <p className="news-detail-modal__empty-text">
                  Sem texto disponível para esta notícia.
                </p>
              )}
            </section>
          </article>

          <aside className="news-detail-modal__aside">
            <section
              className={cn(
                'news-detail-modal__card news-detail-modal__card--clippings',
                modalCrops.length === 1 && 'news-detail-modal__card--clippings-single',
              )}
            >
              <header className="news-detail-modal__card-header">
                <div className="news-detail-modal__card-title-row">
                  <h2 className="news-detail-modal__card-title">Cortes da notícia</h2>
                  <span className="news-detail-modal__count-badge">{modalCrops.length}</span>
                </div>
                {pdfUrl && (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="news-detail-modal__external-link"
                    aria-label="Abrir PDF original"
                    title="Abrir PDF original"
                  >
                    <ExternalLink size={16} strokeWidth={2} aria-hidden />
                  </a>
                )}
              </header>

              <div
                className={cn(
                  'news-detail-modal__clippings',
                  modalCrops.length === 1 && 'news-detail-modal__clippings--single',
                  modalCrops.length > 1 && 'news-detail-modal__clippings--multi',
                )}
              >
                {cropPreviews.map((preview) => {
                  const displayInfo = cropDisplayIndex.get(preview.crop.id)
                  return (
                    <NewsClippingThumbnail
                      key={preview.crop.id}
                      pdfUrl={preview.pdfUrl}
                      crop={preview.crop}
                      displayIndex={displayInfo?.displayIndex}
                      accentColor={cropColor(displayInfo?.colorIndex ?? 0)}
                      renderWidth={modalCrops.length === 1 ? DETAIL_THUMBNAIL_WIDTH_LARGE : undefined}
                      onExpand={() => setExpandedCropId(preview.crop.id)}
                    />
                  )
                })}
              </div>
            </section>

            <section className="news-detail-modal__card news-detail-modal__card--clients">
              <header className="news-detail-modal__card-header">
                <div className="news-detail-modal__card-title-row">
                  <h2 className="news-detail-modal__card-title">
                    Clientes e palavras-chave
                  </h2>
                  {clientRows.length > 0 && (
                    <span className="news-detail-modal__count-badge">{clientRows.length}</span>
                  )}
                </div>
              </header>

              {clientRows.length > 0 ? (
                <ul className="news-detail-modal__clients-list">
                  {clientRows.map((row) => (
                    <li key={`${row.clientName}-${row.keyword}`} className="news-detail-modal__client-item">
                      <span className="news-detail-modal__client-name">{row.clientName}</span>
                      <span className="news-detail-modal__keyword-pill">{row.keyword}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="news-detail-modal__clients-empty">
                  Nenhuma palavra-chave encontrada.
                </p>
              )}
            </section>
          </aside>
        </div>
      </div>

      {expandedPreview && (
        <ClippingLightbox
          pdfUrl={expandedPreview.pdfUrl}
          crop={expandedPreview.crop}
          displayIndex={cropDisplayIndex.get(expandedPreview.crop.id)?.displayIndex}
          onClose={() => setExpandedCropId(null)}
        />
      )}
    </Modal>
  )
}
