import { Link2, MousePointerClick, Scissors, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { StoredNewsItem } from '@/types/session'
import './active-news-banner.css'

interface ActiveNewsBannerProps {
  newsItem?: StoredNewsItem
  hasCrop: boolean
  accentColor?: string
  droppable?: boolean
  dropActive?: boolean
  onClear: () => void
  onDelete?: () => void
  onDragOver?: (e: React.DragEvent) => void
  onDragEnter?: (e: React.DragEvent) => void
  onDragLeave?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
}

export function ActiveNewsBanner({
  newsItem,
  hasCrop,
  accentColor,
  droppable = false,
  dropActive = false,
  onClear,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
}: ActiveNewsBannerProps) {
  if (!newsItem) {
    return (
      <div className="active-news-banner active-news-banner--empty" role="status">
        <span className="active-news-banner__empty-icon" aria-hidden>
          <MousePointerClick size={16} strokeWidth={2} />
        </span>
        <div className="active-news-banner__empty-copy">
          <span className="active-news-banner__empty-title">Nenhuma notícia ativa</span>
          <span className="active-news-banner__empty-hint">
            Selecione uma notícia abaixo ou crie uma nova para começar a cortar.
          </span>
        </div>
      </div>
    )
  }

  const meta = dropActive
    ? 'Solte para agrupar nesta notícia'
    : droppable
      ? 'Solte aqui para agrupar nesta notícia'
      : hasCrop
        ? 'Corte vinculado — novos cortes entram nesta notícia'
        : 'Sem corte — desenhe na página'

  return (
    <div
      className={cn(
        'active-news-banner',
        droppable && 'active-news-banner--droppable',
        dropActive && 'active-news-banner--drop-target',
      )}
      style={accentColor ? { ['--crop-accent' as string]: accentColor } : undefined}
      role="status"
      aria-live="polite"
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <span className="active-news-banner__pulse" aria-hidden />
      <span className="active-news-banner__icon" aria-hidden>
        {droppable || dropActive ? (
          <Link2 size={15} strokeWidth={2.1} />
        ) : (
          <Scissors size={15} strokeWidth={2.1} />
        )}
      </span>
      <div className="active-news-banner__copy">
        <span className="active-news-banner__kicker">Notícia ativa</span>
        <span className="active-news-banner__title">{newsItem.title}</span>
        <span className="active-news-banner__meta">
          Página {newsItem.pageNumber}
          {' · '}
          {meta}
        </span>
      </div>

      <button
        type="button"
        className="active-news-banner__clear"
        onClick={onClear}
        aria-label="Desmarcar notícia ativa"
        title="Desmarcar notícia"
      >
        <X size={14} strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  )
}
