import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { ImageOff, ZoomIn } from 'lucide-react'
import type { Crop } from '@/types/session'
import { renderCropRegionToCanvas } from '@/lib/pdf/documentCache'
import { cn } from '@/utils/cn'
import './news-clipping-thumbnail.css'

const DETAIL_THUMBNAIL_WIDTH = 360
export const DETAIL_THUMBNAIL_WIDTH_LARGE = 520
const LIGHTBOX_WIDTH = 720

interface NewsClippingThumbnailProps {
  pdfUrl: string
  crop: Crop
  displayIndex?: number
  accentColor?: string
  onExpand?: () => void
  renderWidth?: number
}

export function NewsClippingThumbnail({
  pdfUrl,
  crop,
  displayIndex,
  accentColor,
  onExpand,
  renderWidth = DETAIL_THUMBNAIL_WIDTH,
}: NewsClippingThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let cancelled = false
    setStatus('loading')

    void renderCropRegionToCanvas(
      pdfUrl,
      crop.pageNumber,
      crop.rect,
      canvas,
      renderWidth,
    )
      .then((dims) => {
        if (cancelled) return
        setStatus(dims.width > 0 && dims.height > 0 ? 'ready' : 'error')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [pdfUrl, crop.pageNumber, crop.rect, renderWidth])

  const handleExpand = useCallback(() => {
    if (status === 'ready') onExpand?.()
  }, [status, onExpand])

  return (
    <figure
      className="news-clipping-thumbnail"
      style={accentColor ? ({ ['--clip-accent' as string]: accentColor } as CSSProperties) : undefined}
    >
      <button
        type="button"
        className={cn(
          'news-clipping-thumbnail__frame',
          status === 'ready' && 'news-clipping-thumbnail__frame--interactive',
        )}
        onClick={handleExpand}
        disabled={status !== 'ready'}
        aria-label={`Ampliar corte da página ${crop.pageNumber}`}
      >
        {status === 'loading' && (
          <div className="news-clipping-thumbnail__skeleton" aria-hidden>
            <span className="news-clipping-thumbnail__skeleton-shimmer" />
          </div>
        )}

        {status === 'error' && (
          <div className="news-clipping-thumbnail__error" aria-hidden>
            <ImageOff size={20} strokeWidth={1.75} />
            <span>Prévia indisponível</span>
          </div>
        )}

        <div
          className={cn(
            'news-clipping-thumbnail__canvas-wrap',
            status !== 'ready' && 'news-clipping-thumbnail__canvas-wrap--hidden',
          )}
        >
          <canvas ref={canvasRef} className="news-clipping-thumbnail__canvas" />
        </div>

        {status === 'ready' && (
          <span className="news-clipping-thumbnail__zoom-hint" aria-hidden>
            <ZoomIn size={13} strokeWidth={2.25} />
          </span>
        )}

        {displayIndex !== undefined && (
          <span className="news-clipping-thumbnail__badge">{displayIndex}</span>
        )}
      </button>

      <figcaption className="news-clipping-thumbnail__caption">
        <span className="news-clipping-thumbnail__page-label">
          Página <strong>{crop.pageNumber}</strong>
        </span>
      </figcaption>
    </figure>
  )
}

interface ClippingLightboxProps {
  pdfUrl: string
  crop: Crop
  displayIndex?: number
  onClose: () => void
}

export function ClippingLightbox({
  pdfUrl,
  crop,
  displayIndex,
  onClose,
}: ClippingLightboxProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let cancelled = false
    setStatus('loading')

    void renderCropRegionToCanvas(
      pdfUrl,
      crop.pageNumber,
      crop.rect,
      canvas,
      LIGHTBOX_WIDTH,
    )
      .then((dims) => {
        if (cancelled) return
        setStatus(dims.width > 0 && dims.height > 0 ? 'ready' : 'error')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [pdfUrl, crop.pageNumber, crop.rect])

  return (
    <div
      className="news-clipping-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`Corte ampliado da página ${crop.pageNumber}`}
      onClick={onClose}
    >
      <div
        className="news-clipping-lightbox__panel"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="news-clipping-lightbox__header">
          <div className="news-clipping-lightbox__meta">
            {displayIndex !== undefined && (
              <span className="news-clipping-lightbox__index">{displayIndex}</span>
            )}
            <span>
              Página <strong>{crop.pageNumber}</strong>
            </span>
          </div>
          <button
            type="button"
            className="news-clipping-lightbox__close"
            onClick={onClose}
            aria-label="Fechar visualização ampliada"
          >
            Fechar
          </button>
        </header>

        <div className="news-clipping-lightbox__body">
          {status === 'loading' && (
            <div className="news-clipping-lightbox__loading">Carregando corte…</div>
          )}
          {status === 'error' && (
            <div className="news-clipping-lightbox__loading">Não foi possível carregar o corte.</div>
          )}
          <canvas
            ref={canvasRef}
            className={cn(
              'news-clipping-lightbox__canvas',
              status !== 'ready' && 'news-clipping-lightbox__canvas--hidden',
            )}
          />
        </div>
      </div>
    </div>
  )
}
