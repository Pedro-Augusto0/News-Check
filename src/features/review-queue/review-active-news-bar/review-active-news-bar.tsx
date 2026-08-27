import { Info, UserRound } from 'lucide-react'
import { formatClientKeywords } from '@/features/crops/client-stats'
import { Button } from '@/shared/ui/button'
import {  type ReviewQueueItem } from '../model'
import './review-active-news-bar.css'

interface ReviewActiveNewsBarProps {
  item: ReviewQueueItem | null
  index: number
  total: number
  accentColor?: string
  onApprove: () => void
  onViewDetails: () => void
}

export function ReviewActiveNewsBar({
  item,
  index,
  total,
  accentColor,
  onApprove,
  onViewDetails,
}: ReviewActiveNewsBarProps) {
  if (!item) {
    return (
      <header className="review-active-news-bar review-active-news-bar--empty">
        <p className="review-active-news-bar__empty">Nenhuma notícia na fila</p>
      </header>
    )
  }

  const clientLabel = item.hasClient ? formatClientKeywords(item.clientKeywords) : null
  const primaryReason = item.suspectReasons[0]
  const positionLabel = total > 0 ? `${index} de ${total}` : null

  return (
    <header
      className="review-active-news-bar"
      style={accentColor ? { ['--active-news-accent' as string]: accentColor } : undefined}
    >
      <div className="review-active-news-bar__content">
        <span className="review-active-news-bar__accent" aria-hidden />
        <h1 className="review-active-news-bar__title">{item.title}</h1>

        <div className="review-active-news-bar__meta">
          <span>Página {item.pageNumber}</span>
          {positionLabel && (
            <>
              <span className="review-active-news-bar__dot" aria-hidden />
              <span>{positionLabel}</span>
            </>
          )}
          {primaryReason && (
            <>
              <span className="review-active-news-bar__dot" aria-hidden />
            </>
          )}
          {clientLabel && (
            <span
              className="review-active-news-bar__client"
              title={`Palavra-chave do cliente: ${clientLabel}`}
            >
              <UserRound size={12} strokeWidth={2.3} aria-hidden />
              {clientLabel}
            </span>
          )}
        </div>
      </div>

      <div className="review-active-news-bar__actions">
        <Button
          variant="icon"
          className="review-active-news-bar__details"
          onClick={onViewDetails}
          title="Ver informações da notícia (T)"
          aria-label="Ver informações da notícia (T)"
        >
          <Info size={16} strokeWidth={2} />
        </Button>
        <Button
          variant="primary"
          className="review-active-news-bar__approve"
          onClick={onApprove}
          title="Aprovar e ir à próxima (Space)"
        >
          Aprovar e próxima
          <kbd>Space</kbd>
        </Button>
      </div>
    </header>
  )
}
