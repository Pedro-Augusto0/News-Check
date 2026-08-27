import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import type { Crop as CropModel } from '@/features/crops'
import { cropColor, stableColorIndex } from '@/features/crops/colors'
import type { VehicleEdition } from '@/features/edition-session'
import { toDateOnly } from '@/features/publication-api'
import { ListCropThumbnail } from '@/features/news-list/list-crop-thumbnail'
import '@/features/news-list/list-crop-thumbnail/list-thumbnail.css'
import { resolveCropImageUrl } from '@/features/text-extraction'
import { renderImageRegionToCanvas } from '@/shared/image/page-image-cache'
import { Modal } from '@/shared/ui/modal'
import { cn } from '@/shared/ui/utils/cn'
import {  type ReviewQueueItem, type ReviewStatus } from '../model'
import './review-news-detail-modal.css'

const CLIPPING_RENDER_WIDTH = 560

interface ReviewNewsDetailModalProps {
  item: ReviewQueueItem | null
  crops: Record<string, CropModel>
  edition: VehicleEdition | undefined
  status: ReviewStatus | undefined
  open: boolean
  onClose: () => void
}

const STATUS_LABEL: Record<ReviewStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovada',
  rejected: 'Não é notícia',
}

function formatEditionDate(iso: string): string {
  const [year, month, day] = toDateOnly(iso).split('-').map(Number)
  if (!year || !month || !day) return toDateOnly(iso)
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function splitParagraphs(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  return trimmed.split(/\n{2,}/).map((paragraph) => paragraph.replace(/\n/g, ' ').trim())
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function HighlightedText({ text, keywords }: { text: string; keywords: string[] }) {
  const terms = keywords.map((keyword) => keyword.trim()).filter((keyword) => keyword.length > 1)
  if (terms.length === 0) return text

  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi')
  const parts = text.split(pattern)

  return parts.map((part, index) => {
    const isMatch = terms.some((term) => term.toLowerCase() === part.toLowerCase())
    if (!isMatch) return part
    return (
      <mark key={index} className="review-news-detail-modal__mark">
        {part}
      </mark>
    )
  })
}

function ModalClipping({ imageUrl, crop }: { imageUrl?: string; crop: CropModel }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !imageUrl) return

    let cancelled = false
    setReady(false)

    void renderImageRegionToCanvas(imageUrl, crop.rect, canvas, CLIPPING_RENDER_WIDTH)
      .then((dims) => {
        if (!cancelled) setReady(dims.width > 0 && dims.height > 0)
      })
      .catch(() => {
        if (!cancelled) setReady(false)
      })

    return () => {
      cancelled = true
    }
  }, [imageUrl, crop.rect])

  if (!imageUrl) {
    return <div className="review-news-detail-modal__clipping-missing">Prévia indisponível</div>
  }

  return (
    <div className="review-news-detail-modal__clipping-frame">
      {!ready && <span className="review-news-detail-modal__clipping-skeleton" aria-hidden />}
      <canvas
        ref={canvasRef}
        className={cn(
          'review-news-detail-modal__clipping-canvas',
          !ready && 'review-news-detail-modal__clipping-canvas--hidden',
        )}
      />
    </div>
  )
}

export function ReviewNewsDetailModal({
  item,
  crops,
  edition,
  status,
  open,
  onClose,
}: ReviewNewsDetailModalProps) {
  const paragraphs = useMemo(() => splitParagraphs(item?.text ?? ''), [item?.text])
  const [activeCropId, setActiveCropId] = useState<string | null>(null)

  const cropEntries = useMemo(() => {
    if (!item) return []
    return item.cropIds
      .map((cropId, index) => {
        const crop = crops[cropId]
        if (!crop) return null
        const imageUrl = edition ? resolveCropImageUrl(crop, [edition]) : undefined
        const accentColor = cropColor(stableColorIndex(item.newsId ?? item.id))
        return { crop, imageUrl, accentColor, label: String(index + 1) }
      })
      .filter((entry): entry is NonNullable<typeof entry> => !!entry)
  }, [item, crops, edition])

  const activeEntry = cropEntries.find((entry) => entry.crop.id === activeCropId) ?? cropEntries[0]

  if (!item) return null

  const vehicleName = edition?.vehicleName ?? 'Edição'
  const editionDate = edition ? formatEditionDate(edition.editionDate) : null
  const showStatus = status && status !== 'pending'

  return (
    <Modal open={open} hideHeader size="lg" onClose={onClose} className="modal--review-v2">
      <article className="review-news-detail-modal">
        <header className="review-news-detail-modal__masthead">
          <div className="review-news-detail-modal__masthead-row">
            <p className="review-news-detail-modal__publication">{vehicleName}</p>
            <p className="review-news-detail-modal__dateline">
              {editionDate && <span>{editionDate}</span>}
              {editionDate && <span aria-hidden className="review-news-detail-modal__dateline-dot" />}
              <span>Pág. {item.pageNumber}</span>
            </p>
            <button
              type="button"
              className="review-news-detail-modal__close"
              onClick={onClose}
              aria-label="Fechar"
            >
              <X size={15} strokeWidth={2.2} />
            </button>
          </div>
          <div className="review-news-detail-modal__rules" aria-hidden />
          <h2 className="review-news-detail-modal__headline">{item.title || 'Sem título'}</h2>
          <p className="review-news-detail-modal__byline">
            {showStatus && (
              <span
                className={cn(
                  'review-news-detail-modal__flag',
                  status === 'approved' && 'review-news-detail-modal__flag--approved',
                  status === 'rejected' && 'review-news-detail-modal__flag--rejected',
                )}
              >
                {STATUS_LABEL[status]}
              </span>
            )}
            {item.hasClient && (
              <span className="review-news-detail-modal__flag review-news-detail-modal__flag--client">
                {item.clientKeywords.join(' · ') || 'Cliente'}
              </span>
            )}
          </p>
        </header>

        <div className="review-news-detail-modal__desk">
          <aside className="review-news-detail-modal__blotter">
            {activeEntry ? (
              <>
                <figure className="review-news-detail-modal__clipping">
                  <ModalClipping imageUrl={activeEntry.imageUrl} crop={activeEntry.crop} />
                  <figcaption className="review-news-detail-modal__clipping-caption">
                    Recorte {activeEntry.label} · Pág. {activeEntry.crop.pageNumber}
                  </figcaption>
                </figure>
                {cropEntries.length > 1 && (
                  <ul className="review-news-detail-modal__strip" aria-label="Recortes da notícia">
                    {cropEntries.map((entry) => (
                      <li key={entry.crop.id}>
                        <button
                          type="button"
                          className={cn(
                            'review-news-detail-modal__strip-item',
                            entry.crop.id === activeEntry.crop.id && 'review-news-detail-modal__strip-item--active',
                          )}
                          onClick={() => setActiveCropId(entry.crop.id)}
                          aria-label={`Ver recorte ${entry.label}, página ${entry.crop.pageNumber}`}
                          aria-current={entry.crop.id === activeEntry.crop.id}
                        >
                          <ListCropThumbnail
                            pdfUrl={entry.imageUrl}
                            crop={entry.crop}
                            displayIndex={entry.label}
                            accentColor={entry.accentColor}
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="review-news-detail-modal__quiet">Nenhum recorte vinculado.</p>
            )}
          </aside>

          <section className="review-news-detail-modal__copy" aria-label="Texto extraído">
            {paragraphs.length > 0 ? (
              paragraphs.map((paragraph, index) => (
                <p key={index}>
                  <HighlightedText text={paragraph} keywords={item.clientKeywords} />
                </p>
              ))
            ) : (
              <p className="review-news-detail-modal__quiet">Sem texto extraído para esta notícia.</p>
            )}
          </section>
        </div>
      </article>
    </Modal>
  )
}
