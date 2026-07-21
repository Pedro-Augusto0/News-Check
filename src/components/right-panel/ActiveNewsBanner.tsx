import { MousePointerClick, Scissors, X } from 'lucide-react'
import type { StoredNewsItem } from '@/types/session'
import './active-news-banner.css'

interface ActiveNewsBannerProps {
  newsItem?: StoredNewsItem
  hasCrop: boolean
  accentColor?: string
  onClear: () => void
  onDelete?: () => void
}

export function ActiveNewsBanner({
  newsItem,
  hasCrop,
  accentColor,
  onClear,
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

  return (
    <div
      className="active-news-banner"
      style={accentColor ? { ['--crop-accent' as string]: accentColor } : undefined}
      role="status"
      aria-live="polite"
    >
      <span className="active-news-banner__pulse" aria-hidden />
      <span className="active-news-banner__icon" aria-hidden>
        <Scissors size={15} strokeWidth={2.1} />
      </span>
      <div className="active-news-banner__copy">
        <span className="active-news-banner__kicker">Notícia ativa</span>
        <span className="active-news-banner__title">{newsItem.title}</span>
        <span className="active-news-banner__meta">
          Página {newsItem.pageNumber}
          {' · '}
          {hasCrop ? 'Corte vinculado — novos cortes entram nesta notícia' : 'Sem corte — desenhe na página'}
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
