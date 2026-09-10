import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  FilePlus2,
  FileText,
  Maximize2,
  Minus,
  Newspaper,
  Plus,
  Scissors,
  Users,
  X,
} from 'lucide-react'
import type { Crop as CropModel } from '@/features/crops'
import { cropColor } from '@/features/crops/colors'
import type { VehicleEdition } from '@/features/edition-session'
import { toDateOnly } from '@/features/publication-api'
import { resolveCropImageUrl } from '@/features/text-extraction'
import { loadPageImage, renderImageRegionToCanvas, renderImageToCanvas } from '@/shared/image/page-image-cache'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { cn } from '@/shared/ui/utils/cn'
import {
  highlightKeywordSegments,
  normalizeKeyword,
  resolveClientMatchGroups,
  stepReviewZoom,
  uniqueKeywords,
} from '../application'
import type { GroupedClientMatch } from '../application'
import { type ReviewQueueItem, type ReviewStatus } from '../model'
import './review-news-detail-modal.css'

const CLIPPING_RENDER_WIDTH = 560
const CLIPPING_FULLSCREEN_WIDTH = 1600
const PAGE_RENDER_WIDTH = 720
const isMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform)
const APPROVE_SHORTCUT = isMac ? '⌘S' : 'Ctrl+S'

type DetailTab = 'news' | 'clips'

interface CropEntry {
  crop: CropModel
  imageUrl: string | undefined
  accentColor: string
  label: string
  column: number
}

interface ReviewNewsDetailModalProps {
  item: ReviewQueueItem | null
  crops: Record<string, CropModel>
  edition: VehicleEdition | undefined
  status: ReviewStatus | undefined
  open: boolean
  onClose: () => void
  onApprove?: () => void
  onChangeTitle?: (title: string) => void
  onChangeText?: (text: string) => void
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

function inferColumnNumber(rect: { x: number; width: number }): number {
  const center = rect.x + rect.width / 2
  if (center < 34) return 1
  if (center < 67) return 2
  return 3
}

function splitParagraphs(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  return trimmed.split(/\n{2,}/).map((paragraph) => paragraph.replace(/\n/g, ' ').trim())
}

function joinParagraphs(parts: string[]): string {
  return parts
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join('\n\n')
}

function paragraphsFromText(text: string): string[] {
  const parts = splitParagraphs(text)
  return parts.length > 0 ? parts : ['']
}

function AutosizeTextarea({
  value,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  return <textarea {...props} ref={ref} className={className} value={value} rows={1} />
}

function HighlightedText({
  text,
  keywords,
  emphasisKeywords = [],
}: {
  text: string
  keywords: string[]
  emphasisKeywords?: string[]
}) {
  const segments = highlightKeywordSegments(text, keywords)
  const emphasis = new Set(emphasisKeywords.map(normalizeKeyword))
  return segments.map((segment, index) =>
    segment.matched ? (
      <mark
        key={index}
        className={cn(
          'review-news-detail-modal__mark',
          emphasis.has(normalizeKeyword(segment.text)) && 'review-news-detail-modal__mark--emphasis',
        )}
      >
        {segment.text}
      </mark>
    ) : (
      segment.text
    ),
  )
}

function ModalClipping({
  imageUrl,
  crop,
  renderWidth = CLIPPING_RENDER_WIDTH,
}: {
  imageUrl?: string
  crop: CropModel
  renderWidth?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !imageUrl) return

    let cancelled = false
    setReady(false)

    void renderImageRegionToCanvas(imageUrl, crop.rect, canvas, renderWidth)
      .then((dims) => {
        if (!cancelled) setReady(dims.width > 0 && dims.height > 0)
      })
      .catch(() => {
        if (!cancelled) setReady(false)
      })

    return () => {
      cancelled = true
    }
  }, [imageUrl, crop.rect, renderWidth])

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

function ModalPagePreview({
  imageUrl,
  entries,
  activeCropId,
  canStepCrops,
  onSelectCrop,
  onPrevCrop,
  onNextCrop,
  onMaximize,
}: {
  imageUrl?: string
  entries: CropEntry[]
  activeCropId?: string
  canStepCrops?: boolean
  onSelectCrop: (cropId: string) => void
  onPrevCrop?: () => void
  onNextCrop?: () => void
  onMaximize?: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    setZoom(1)
  }, [imageUrl])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !imageUrl) return

    let cancelled = false
    setReady(false)

    void loadPageImage(imageUrl)
      .then((image) => {
        if (cancelled) return null
        const scale = PAGE_RENDER_WIDTH / Math.max(1, image.naturalWidth)
        return renderImageToCanvas(imageUrl, canvas, scale)
      })
      .then((dims) => {
        if (!cancelled) setReady(!!dims && dims.width > 0 && dims.height > 0)
      })
      .catch(() => {
        if (!cancelled) setReady(false)
      })

    return () => {
      cancelled = true
    }
  }, [imageUrl])

  if (!imageUrl) {
    return <div className="review-news-detail-modal__clipping-missing">Prévia indisponível</div>
  }

  return (
    <div className="review-news-detail-modal__page-stage">
      <div
        className={cn(
          'review-news-detail-modal__page-scroll',
          zoom > 1 && 'review-news-detail-modal__page-scroll--zoomed',
        )}
      >
        <div
          className={cn(
            'review-news-detail-modal__page',
            zoom > 1 && 'review-news-detail-modal__page--zoomed',
          )}
          style={{ ['--page-zoom' as string]: String(zoom) }}
        >
          <div className="review-news-detail-modal__page-sheet">
            {!ready && <span className="review-news-detail-modal__clipping-skeleton" aria-hidden />}
            <canvas
              ref={canvasRef}
              className={cn(
                'review-news-detail-modal__page-canvas',
                !ready && 'review-news-detail-modal__clipping-canvas--hidden',
              )}
            />
            {ready && (
              <div className="review-news-detail-modal__page-overlay">
                {entries.map((entry) => (
                  <button
                    key={entry.crop.id}
                    type="button"
                    className={cn(
                      'review-news-detail-modal__page-box',
                      entry.crop.id === activeCropId && 'review-news-detail-modal__page-box--active',
                    )}
                    style={{
                      left: `${entry.crop.rect.x}%`,
                      top: `${entry.crop.rect.y}%`,
                      width: `${entry.crop.rect.width}%`,
                      height: `${entry.crop.rect.height}%`,
                      ['--crop-accent' as string]: entry.accentColor,
                    }}
                    onClick={() => onSelectCrop(entry.crop.id)}
                    aria-label={`Recorte ${entry.label}, página ${entry.crop.pageNumber}`}
                    aria-current={entry.crop.id === activeCropId}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {canStepCrops && (
        <>
          <button
            type="button"
            className="review-news-detail-modal__crop-nav review-news-detail-modal__crop-nav--prev"
            onClick={onPrevCrop}
            aria-label="Recorte anterior"
            title="Recorte anterior"
          >
            <ChevronLeft size={18} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            className="review-news-detail-modal__crop-nav review-news-detail-modal__crop-nav--next"
            onClick={onNextCrop}
            aria-label="Próximo recorte"
            title="Próximo recorte"
          >
            <ChevronRight size={18} strokeWidth={2.2} />
          </button>
        </>
      )}
      <div className="review-news-detail-modal__zoom" role="group" aria-label="Zoom do recorte">
        <button
          type="button"
          className="review-news-detail-modal__zoom-btn"
          onClick={() => setZoom((value) => stepReviewZoom(value, -1))}
          aria-label="Diminuir zoom"
        >
          <Minus size={12} strokeWidth={2.2} />
        </button>
        <span className="review-news-detail-modal__zoom-label">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          className="review-news-detail-modal__zoom-btn"
          onClick={() => setZoom((value) => stepReviewZoom(value, 1))}
          aria-label="Aumentar zoom"
        >
          <Plus size={12} strokeWidth={2.2} />
        </button>
        <span className="review-news-detail-modal__zoom-rule" aria-hidden />
        {onMaximize && (
          <button
            type="button"
            className="review-news-detail-modal__zoom-btn"
            onClick={onMaximize}
            title="Ver recorte em tela cheia"
            aria-label="Ver recorte em tela cheia"
          >
            <Maximize2 size={12} strokeWidth={2.1} />
          </button>
        )}
        <button
          type="button"
          className="review-news-detail-modal__zoom-btn"
          onClick={() => setZoom(1)}
          title="Redefinir zoom"
          aria-label="Redefinir zoom"
        >
          <X size={12} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  )
}

function CropFullscreen({
  entry,
  total,
  onClose,
  onPrev,
  onNext,
}: {
  entry: CropEntry
  total: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}) {
  const canStep = total > 1

  return (
    <div
      className="review-news-detail-modal__crop-fs"
      role="dialog"
      aria-modal="true"
      aria-label={`Recorte ${entry.label} em tela cheia`}
    >
      <header className="review-news-detail-modal__crop-fs-bar">
        <p className="review-news-detail-modal__crop-fs-title">
          Recorte {entry.label} de {total}
          <span>Pág. {entry.crop.pageNumber}</span>
        </p>
        <div className="review-news-detail-modal__crop-fs-actions">
          {canStep && (
            <>
              <button
                type="button"
                className="review-news-detail-modal__crop-fs-btn"
                onClick={onPrev}
                aria-label="Recorte anterior"
              >
                <ChevronLeft size={18} strokeWidth={2.2} />
              </button>
              <button
                type="button"
                className="review-news-detail-modal__crop-fs-btn"
                onClick={onNext}
                aria-label="Próximo recorte"
              >
                <ChevronRight size={18} strokeWidth={2.2} />
              </button>
            </>
          )}
          <button
            type="button"
            className="review-news-detail-modal__crop-fs-btn"
            onClick={onClose}
            aria-label="Fechar tela cheia"
            title="Fechar tela cheia (Esc)"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>
      </header>
      <div className="review-news-detail-modal__crop-fs-stage">
        {canStep && (
          <button
            type="button"
            className="review-news-detail-modal__crop-nav review-news-detail-modal__crop-nav--prev"
            onClick={onPrev}
            aria-label="Recorte anterior"
          >
            <ChevronLeft size={22} strokeWidth={2.2} />
          </button>
        )}
        <ModalClipping
          imageUrl={entry.imageUrl}
          crop={entry.crop}
          renderWidth={CLIPPING_FULLSCREEN_WIDTH}
        />
        {canStep && (
          <button
            type="button"
            className="review-news-detail-modal__crop-nav review-news-detail-modal__crop-nav--next"
            onClick={onNext}
            aria-label="Próximo recorte"
          >
            <ChevronRight size={22} strokeWidth={2.2} />
          </button>
        )}
      </div>
    </div>
  )
}

function ClientMatchesIndex({ groups }: { groups: GroupedClientMatch[] }) {
  if (groups.length === 0) return null

  return (
    <ul className="review-news-detail-modal__match-list">
      {groups.map((group) => (
        <li key={group.customerName} className="review-news-detail-modal__match">
          <h4
            className={cn(
              'review-news-detail-modal__match-name',
              group.ownChannel && 'review-news-detail-modal__match-name--own',
            )}
            title={group.ownChannel ? `${group.customerName} · canal próprio` : group.customerName}
          >
            {group.customerName}
          </h4>
          {group.channels.map((channel) => (
            <div
              key={`${group.customerName}:${channel.channelName || 'keywords'}`}
              className="review-news-detail-modal__match-channel"
            >
              {channel.channelName ? (
                <p className="review-news-detail-modal__match-channel-name">{channel.channelName}</p>
              ) : null}
              {channel.keywords.length > 0 && (
                <ul className="review-news-detail-modal__match-keywords">
                  {channel.keywords.map((keyword) => (
                    <li key={keyword}>
                      <mark>{keyword}</mark>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </li>
      ))}
    </ul>
  )
}

export function ReviewNewsDetailModal({
  item,
  crops,
  edition,
  status,
  open,
  onClose,
  onApprove,
  onChangeTitle,
  onChangeText,
}: ReviewNewsDetailModalProps) {
  const keywords = useMemo(
    () => uniqueKeywords([item?.clientKeywords, edition?.clientKeywords]),
    [item?.clientKeywords, edition?.clientKeywords],
  )
  const clientGroups = useMemo(
    () => (item ? resolveClientMatchGroups(item) : []),
    [item],
  )
  const [activeCropId, setActiveCropId] = useState<string | null>(null)
  const [cropFullscreen, setCropFullscreen] = useState(false)
  const [activeTab, setActiveTab] = useState<DetailTab>('news')
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [titleDraft, setTitleDraft] = useState(item?.title ?? '')
  const [paragraphDrafts, setParagraphDrafts] = useState(() => paragraphsFromText(item?.text ?? ''))
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingParagraph, setEditingParagraph] = useState<number | null>(null)
  const canEdit = !!onChangeTitle || !!onChangeText

  const cropEntries = useMemo(() => {
    if (!item) return [] as CropEntry[]
    const entries: CropEntry[] = []
    item.cropIds.forEach((cropId, index) => {
      const crop = crops[cropId]
      if (!crop) return
      entries.push({
        crop,
        imageUrl: edition ? resolveCropImageUrl(crop, [edition]) : undefined,
        accentColor: cropColor(index),
        label: String(index + 1),
        column: inferColumnNumber(crop.rect),
      })
    })
    return entries
  }, [item, crops, edition])

  const samePageEntries = useMemo(() => {
    const active = cropEntries.find((entry) => entry.crop.id === activeCropId) ?? cropEntries[0]
    if (!active) return []
    return cropEntries.filter(
      (entry) => entry.crop.pageNumber === active.crop.pageNumber && entry.imageUrl === active.imageUrl,
    )
  }, [cropEntries, activeCropId])

  const activeEntry = cropEntries.find((entry) => entry.crop.id === activeCropId) ?? cropEntries[0]
  const activeCropIndex = activeEntry
    ? Math.max(0, cropEntries.findIndex((entry) => entry.crop.id === activeEntry.crop.id))
    : 0
  const hasSidebar = clientGroups.length > 0
  const canStepCrops = cropEntries.length > 1

  const stepActiveCrop = (delta: number) => {
    if (cropEntries.length === 0) return
    const nextIndex = (activeCropIndex + delta + cropEntries.length) % cropEntries.length
    const next = cropEntries[nextIndex]
    if (next) setActiveCropId(next.crop.id)
  }

  useEffect(() => {
    setTitleDraft(item?.title ?? '')
    setParagraphDrafts(paragraphsFromText(item?.text ?? ''))
    setEditingTitle(false)
    setEditingParagraph(null)
    setActiveTab('news')
    setActiveCropId(null)
    setCropFullscreen(false)
  }, [item?.id, item?.title, item?.text])

  useEffect(() => {
    if (!open) return

    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false
      const tag = target.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && cropFullscreen) {
        event.preventDefault()
        event.stopPropagation()
        setCropFullscreen(false)
        return
      }
      if (isTypingTarget(event.target)) return
      if (event.key === 'ArrowLeft' && canStepCrops) {
        event.preventDefault()
        stepActiveCrop(-1)
        return
      }
      if (event.key === 'ArrowRight' && canStepCrops) {
        event.preventDefault()
        stepActiveCrop(1)
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open, cropFullscreen, canStepCrops, activeCropIndex, cropEntries])

  if (!item) return null

  const vehicleName = edition?.vehicleName ?? 'Edição'
  const editionDate = edition ? formatEditionDate(edition.editionDate) : null
  const showStatus = status && status !== 'pending'
  const canApprove = !!onApprove && (!status || status === 'pending')
  const clientCount = Math.max(clientGroups.length, item.customerNames.length)
  const clipCount = cropEntries.length

  const commitEdits = () => {
    if (!canEdit) return
    const nextTitle = titleDraft.trim()
    if (onChangeTitle && nextTitle && nextTitle !== item.title) onChangeTitle(nextTitle)
    const nextText = joinParagraphs(paragraphDrafts)
    if (onChangeText && nextText !== (item.text ?? '')) onChangeText(nextText)
  }

  const handleClose = () => {
    commitEdits()
    onClose()
  }

  const handleApprove = () => {
    if (!onApprove) return
    commitEdits()
    onApprove()
  }

  const selectCrop = (cropId: string) => {
    setActiveCropId(cropId)
    setActiveTab('news')
  }

  return (
    <Modal open={open} hideHeader size="lg" onClose={handleClose} className="modal--review-v2">
      <article className="review-news-detail-modal">
        <header className="review-news-detail-modal__masthead">
          <div className="review-news-detail-modal__chrome">
            <p className="review-news-detail-modal__chrome-title">
              <FilePlus2 size={15} strokeWidth={2.1} aria-hidden />
              <span>Detalhes da notícia</span>
              <kbd>F2</kbd>
            </p>
            <button
              type="button"
              className="review-news-detail-modal__close"
              onClick={handleClose}
              aria-label="Fechar"
            >
              Fechar
              <kbd>Esc</kbd>
              <X size={14} strokeWidth={2.2} />
            </button>
          </div>

          {canEdit && onChangeTitle && editingTitle ? (
            <textarea
              className="review-news-detail-modal__headline-input"
              value={titleDraft}
              rows={2}
              autoFocus
              onChange={(event) => setTitleDraft(event.target.value)}
              onBlur={() => {
                const next = titleDraft.trim()
                if (next && next !== item.title) onChangeTitle(next)
                else setTitleDraft(item.title)
                setEditingTitle(false)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setTitleDraft(item.title)
                  setEditingTitle(false)
                  return
                }
                if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
                  event.preventDefault()
                  const next = titleDraft.trim()
                  if (next && next !== item.title) onChangeTitle(next)
                  setEditingTitle(false)
                }
              }}
              aria-label="Título da notícia"
            />
          ) : (
            <h2
              className={cn(
                'review-news-detail-modal__headline',
                canEdit && onChangeTitle && 'review-news-detail-modal__headline--editable',
              )}
              onClick={() => {
                if (canEdit && onChangeTitle) setEditingTitle(true)
              }}
              title={canEdit && onChangeTitle ? 'Clique para editar o título' : undefined}
            >
              <HighlightedText text={titleDraft || 'Sem título'} keywords={keywords} />
            </h2>
          )}

          <ul className="review-news-detail-modal__meta">
            <li>
              <Newspaper size={13} strokeWidth={2.1} aria-hidden />
              <span>{vehicleName}</span>
            </li>
            {editionDate && (
              <li>
                <Clock size={13} strokeWidth={2.1} aria-hidden />
                <span>{editionDate}</span>
              </li>
            )}
            <li>
              <FileText size={13} strokeWidth={2.1} aria-hidden />
              <span>Pág. {item.pageNumber}</span>
            </li>
            <li>
              <Scissors size={13} strokeWidth={2.1} aria-hidden />
              <span>
                {clipCount} {clipCount === 1 ? 'recorte' : 'recortes'}
              </span>
            </li>
            {clientCount > 0 && (
              <li>
                <button
                  type="button"
                  className="review-news-detail-modal__meta-clients"
                  onClick={() => {
                    setActiveTab('news')
                    setSidebarExpanded(true)
                  }}
                >
                  <Users size={13} strokeWidth={2.1} aria-hidden />
                  <span>
                    {clientCount} {clientCount === 1 ? 'cliente' : 'clientes'}
                  </span>
                </button>
              </li>
            )}
          </ul>

          {showStatus && (
            <p className="review-news-detail-modal__byline">
              <span
                className={cn(
                  'review-news-detail-modal__flag',
                  status === 'approved' && 'review-news-detail-modal__flag--approved',
                  status === 'rejected' && 'review-news-detail-modal__flag--rejected',
                )}
              >
                {STATUS_LABEL[status]}
              </span>
            </p>
          )}

          <nav className="review-news-detail-modal__tabs" aria-label="Seções da notícia">
            <button
              type="button"
              className={cn(
                'review-news-detail-modal__tab',
                activeTab === 'news' && 'review-news-detail-modal__tab--active',
              )}
              onClick={() => setActiveTab('news')}
              aria-current={activeTab === 'news' ? 'page' : undefined}
            >
              Notícia
            </button>
            <button
              type="button"
              className={cn(
                'review-news-detail-modal__tab',
                activeTab === 'clips' && 'review-news-detail-modal__tab--active',
              )}
              onClick={() => setActiveTab('clips')}
              aria-current={activeTab === 'clips' ? 'page' : undefined}
            >
              Recortes ({clipCount})
            </button>
          </nav>
        </header>

        {activeTab === 'news' ? (
          <div
            className={cn(
              'review-news-detail-modal__desk',
              hasSidebar && 'review-news-detail-modal__desk--with-matches',
              hasSidebar && !sidebarExpanded && 'review-news-detail-modal__desk--sidebar-collapsed',
            )}
          >
            <aside className="review-news-detail-modal__blotter">
              {activeEntry ? (
                <>
                  <div className="review-news-detail-modal__blotter-head">
                    <p
                      className="review-news-detail-modal__blotter-label"
                      style={{ ['--crop-accent' as string]: activeEntry.accentColor }}
                    >
                      Recorte atual
                    </p>
                    <div
                      className="review-news-detail-modal__crop-pager"
                      style={{ ['--crop-accent' as string]: activeEntry.accentColor }}
                    >
                      {canStepCrops && (
                        <button
                          type="button"
                          className="review-news-detail-modal__crop-pager-btn"
                          onClick={() => stepActiveCrop(-1)}
                          aria-label="Recorte anterior"
                          title="Recorte anterior"
                        >
                          <ChevronLeft size={14} strokeWidth={2.4} />
                        </button>
                      )}
                      <span className="review-news-detail-modal__blotter-badge">
                        {activeEntry.label} de {clipCount}
                      </span>
                      {canStepCrops && (
                        <button
                          type="button"
                          className="review-news-detail-modal__crop-pager-btn"
                          onClick={() => stepActiveCrop(1)}
                          aria-label="Próximo recorte"
                          title="Próximo recorte"
                        >
                          <ChevronRight size={14} strokeWidth={2.4} />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      className="review-news-detail-modal__crop-pager-btn review-news-detail-modal__crop-pager-btn--max"
                      onClick={() => setCropFullscreen(true)}
                      aria-label="Ver recorte em tela cheia"
                      title="Ver recorte em tela cheia"
                    >
                      <Maximize2 size={14} strokeWidth={2.2} />
                    </button>
                  </div>
                  <ModalPagePreview
                    imageUrl={activeEntry.imageUrl}
                    entries={samePageEntries}
                    activeCropId={activeEntry.crop.id}
                    canStepCrops={canStepCrops}
                    onSelectCrop={setActiveCropId}
                    onPrevCrop={() => stepActiveCrop(-1)}
                    onNextCrop={() => stepActiveCrop(1)}
                    onMaximize={() => setCropFullscreen(true)}
                  />
                </>
              ) : (
                <p className="review-news-detail-modal__quiet">Nenhum recorte vinculado.</p>
              )}
            </aside>

            <section className="review-news-detail-modal__copy" aria-label="Texto extraído">
              {paragraphDrafts.every((part) => !part.trim()) && !canEdit ? (
                <p className="review-news-detail-modal__quiet">Sem texto extraído para esta notícia.</p>
              ) : (
                paragraphDrafts.map((paragraph, index) => {
                  const entry = cropEntries[index]
                  const editing = canEdit && onChangeText && editingParagraph === index
                  const hasText = paragraph.trim().length > 0
                  const isActive = !!entry && entry.crop.id === activeEntry?.crop.id

                  return (
                    <article
                      key={index}
                      className={cn(
                        'review-news-detail-modal__crop-copy',
                        entry && 'review-news-detail-modal__crop-copy--linked',
                        isActive && 'review-news-detail-modal__crop-copy--active',
                        canEdit && onChangeText && 'review-news-detail-modal__crop-copy--editable',
                        editing && 'review-news-detail-modal__crop-copy--editing',
                      )}
                      style={entry ? { ['--crop-accent' as string]: entry.accentColor } : undefined}
                      onClick={entry && !editing ? () => setActiveCropId(entry.crop.id) : undefined}
                    >
                      <p className="review-news-detail-modal__crop-copy-label">
                        {entry ? (
                          <>
                            <span className="review-news-detail-modal__crop-copy-index">{entry.label}</span>
                            Recorte {entry.label} - Pág. {entry.crop.pageNumber} - Coluna {entry.column}
                          </>
                        ) : paragraphDrafts.length > 1 ? (
                          `Trecho ${index + 1}`
                        ) : (
                          'Texto'
                        )}
                      </p>
                      {editing ? (
                        <AutosizeTextarea
                          className="review-news-detail-modal__crop-copy-input"
                          value={paragraph}
                          autoFocus
                          onChange={(event) => {
                            const value = event.target.value
                            setParagraphDrafts((prev) =>
                              prev.map((part, partIndex) => (partIndex === index ? value : part)),
                            )
                          }}
                          onBlur={() => {
                            setParagraphDrafts((prev) => {
                              if (onChangeText) onChangeText(joinParagraphs(prev))
                              return prev
                            })
                            setEditingParagraph(null)
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                              setParagraphDrafts(paragraphsFromText(item.text ?? ''))
                              setEditingParagraph(null)
                              return
                            }
                            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
                              event.preventDefault()
                              setParagraphDrafts((prev) => {
                                if (onChangeText) onChangeText(joinParagraphs(prev))
                                return prev
                              })
                              setEditingParagraph(null)
                            }
                          }}
                          aria-label={
                            entry
                              ? `Texto do recorte ${entry.label}`
                              : `Texto da notícia, trecho ${index + 1}`
                          }
                        />
                      ) : (
                        <p
                          className={cn(!hasText && 'review-news-detail-modal__quiet')}
                          onClick={(event) => {
                            if (!canEdit || !onChangeText) return
                            event.stopPropagation()
                            setEditingParagraph(index)
                          }}
                          title={canEdit && onChangeText ? 'Clique para editar o texto' : undefined}
                        >
                          {hasText ? (
                            <HighlightedText
                              text={paragraph}
                              keywords={keywords}
                              emphasisKeywords={entry?.crop.clientKeywordsFound}
                            />
                          ) : (
                            'Clique para editar o texto'
                          )}
                        </p>
                      )}
                    </article>
                  )
                })
              )}
            </section>

            {hasSidebar && (
              <aside
                className={cn(
                  'review-news-detail-modal__sidebar',
                  !sidebarExpanded && 'review-news-detail-modal__sidebar--collapsed',
                )}
                aria-label="Clientes"
              >
                <button
                  type="button"
                  className="review-news-detail-modal__sidebar-toggle"
                  onClick={() => setSidebarExpanded((open) => !open)}
                  aria-expanded={sidebarExpanded}
                >
                  {sidebarExpanded ? (
                    <ChevronDown size={13} strokeWidth={2.2} aria-hidden />
                  ) : (
                    <ChevronRight size={13} strokeWidth={2.2} aria-hidden />
                  )}
                  <span>Clientes</span>
                </button>
                {sidebarExpanded ? <ClientMatchesIndex groups={clientGroups} /> : null}
              </aside>
            )}
          </div>
        ) : (
          <div className="review-news-detail-modal__clips" aria-label="Recortes da notícia">
            {cropEntries.length === 0 ? (
              <p className="review-news-detail-modal__quiet">Nenhum recorte vinculado.</p>
            ) : (
              <ul className="review-news-detail-modal__clips-grid">
                {cropEntries.map((entry) => (
                  <li key={entry.crop.id}>
                    <button
                      type="button"
                      className={cn(
                        'review-news-detail-modal__clip-card',
                        entry.crop.id === activeEntry?.crop.id &&
                          'review-news-detail-modal__clip-card--active',
                      )}
                      style={{ ['--crop-accent' as string]: entry.accentColor }}
                      onClick={() => selectCrop(entry.crop.id)}
                    >
                      <span className="review-news-detail-modal__clip-card-label">
                        <span className="review-news-detail-modal__crop-copy-index">{entry.label}</span>
                        Recorte {entry.label} · Pág. {entry.crop.pageNumber}
                      </span>
                      <ModalClipping imageUrl={entry.imageUrl} crop={entry.crop} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <footer className="review-news-detail-modal__footer">
          <p className="review-news-detail-modal__tip">
            Dica: use as setas para trocar de recorte ou maximize o corte para ver em tela cheia.
          </p>
          <div className="review-news-detail-modal__footer-actions">
            <Button
              variant="secondary"
              className="review-news-detail-modal__dismiss"
              onClick={handleClose}
            >
              <kbd>Esc</kbd>
              Fechar
            </Button>
            {canApprove && (
              <Button
                variant="primary"
                className="review-news-detail-modal__approve"
                onClick={handleApprove}
                title={`Aprovar e ir à próxima (${APPROVE_SHORTCUT})`}
              >
                <Check size={15} strokeWidth={2.5} aria-hidden />
                Aprovar e próxima
                <kbd>{APPROVE_SHORTCUT}</kbd>
              </Button>
            )}
          </div>
        </footer>

        {cropFullscreen && activeEntry && (
          <CropFullscreen
            entry={activeEntry}
            total={clipCount}
            onClose={() => setCropFullscreen(false)}
            onPrev={() => stepActiveCrop(-1)}
            onNext={() => stepActiveCrop(1)}
          />
        )}
      </article>
    </Modal>
  )
}
