import { Check, Info, Link2, Newspaper } from 'lucide-react'
import logoCservice from '@/assets/logocs-aberto.png'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/ui/utils/cn'
import { type ReviewQueueItem } from '../model'
import './review-active-news-bar.css'

const isMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform)
const APPROVE_SHORTCUT = isMac ? '⌘ + S' : 'Ctrl + S'

interface ReviewActiveNewsBarProps {
  item: ReviewQueueItem | null
  index: number
  total: number
  accentColor?: string
  focusLocked?: boolean
  coverPageNumber?: string | null
  isOnCover?: boolean
  onAddSegment?: () => void
  onApprove: () => void
  onViewCover?: () => void
  onViewDetails: () => void
}

export function ReviewActiveNewsBar({
  item,
  index,
  total,
  accentColor,
  focusLocked = false,
  coverPageNumber = null,
  isOnCover = false,
  onAddSegment,
  onApprove,
  onViewCover,
  onViewDetails,
}: ReviewActiveNewsBarProps) {
  const positionLabel = total > 0 ? `${index} de ${total}` : null
  const canAddSegment = !!item && !focusLocked && item.kind === 'news' && !!item.newsId && !!onAddSegment
  const coverLabel = coverPageNumber ? `Ir para capa (pág. ${coverPageNumber})` : 'Ir para capa'

  return (
    <header
      className="review-active-news-bar"
      style={accentColor ? { ['--active-news-accent' as string]: accentColor } : undefined}
    >
      <div className="review-active-news-bar__brand">
        <img
          src={logoCservice}
          alt="CService"
          className="review-active-news-bar__logo"
          width={132}
          height={24}
        />
      </div>

      {item ? (
        <div className="review-active-news-bar__content">
          <div className="review-active-news-bar__title-row">
            <h1 className="review-active-news-bar__title">{item.title}</h1>
            <button
              type="button"
              className="review-active-news-bar__details"
              onClick={onViewDetails}
              title="Ver informações da notícia (F2)"
              aria-label="Ver informações da notícia (F2)"
            >
              <Info size={14} strokeWidth={2} aria-hidden />
            </button>
          </div>
          <p className="review-active-news-bar__meta">
            <span>Página {item.pageNumber}</span>
            {positionLabel && (
              <>
                <span className="review-active-news-bar__meta-sep" aria-hidden>
                  •
                </span>
                <span>{positionLabel}</span>
              </>
            )}
          </p>
        </div>
      ) : (
        <p className="review-active-news-bar__empty">Nenhuma notícia na fila</p>
      )}

      <div className="review-active-news-bar__actions">
      
        {onViewCover && (
          <button
            type="button"
            className="review-active-news-bar__icon-btn"
            onClick={onViewCover}
            disabled={isOnCover}
            title={coverLabel}
            aria-label={coverLabel}
          >
            <Newspaper size={15} strokeWidth={2} aria-hidden />
          </button>
        )}
        {onAddSegment && item?.kind === 'news' && item.newsId && (
          <Button
            variant="secondary"
            className={cn(
              'review-active-news-bar__segment',
              canAddSegment && 'review-active-news-bar__segment--visible',
            )}
            onClick={onAddSegment}
            disabled={!canAddSegment}
            tabIndex={canAddSegment ? 0 : -1}
            aria-hidden={!canAddSegment}
            title="Travar esta notícia e buscar outro segmento para juntar"
          >
            <Link2 size={14} strokeWidth={2.2} aria-hidden />
            Adicionar outro segmento
          </Button>
        )}

        {item && (
          <Button
            variant="primary"
            className="review-active-news-bar__approve"
            onClick={onApprove}
            title={`Aprovar e ir à próxima (${APPROVE_SHORTCUT})`}
          >
            <Check size={15} strokeWidth={2.5} aria-hidden />
            Aprovar e próxima
            <kbd>{APPROVE_SHORTCUT}</kbd>
          </Button>
        )}
      </div>
    </header>
  )
}
