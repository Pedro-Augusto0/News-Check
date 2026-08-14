import { Scissors, Trash2, UserRound, Eye } from 'lucide-react'
import type { NewsItem } from '@/types/session'
import { cn } from '@/utils/cn'
import { formatClientKeywords } from '@/utils/cropClientStats'
import { newsItemHasClient } from '@/utils/pendingNews'
import '@/components/shared/list-thumbnail.css'
import './crop-list-item.css'

interface PendingNewsListItemProps {
  item: NewsItem
  pageNumber: string
  isSelected?: boolean
  isActiveNews?: boolean
  canDelete?: boolean
  onSelect: (event?: React.MouseEvent) => void
  onViewText?: () => void
  onDelete?: () => void
}

function ClientBadge({ keywords }: { keywords: string[] }) {
  const label = formatClientKeywords(keywords)
  return (
    <span
      className="crop-list-item__client-badge"
      title={`Palavra-chave do cliente encontrada: ${label}`}
      aria-label={`Cliente: ${label}`}
    >
      <UserRound size={11} strokeWidth={2.3} aria-hidden />
    </span>
  )
}

function NeedsCropBadge() {
  return (
    <span
      className="crop-list-item__needs-crop-badge"
      title="Esta notícia ainda não tem corte — selecione e desenhe na página"
      aria-label="Precisa de corte"
    >
      <Scissors size={11} strokeWidth={2.3} aria-hidden />
    </span>
  )
}

export function PendingNewsListItem({
  item,
  pageNumber,
  isSelected,
  isActiveNews = false,
  canDelete = false,
  onSelect,
  onViewText,
  onDelete,
}: PendingNewsListItemProps) {
  const hasClient = newsItemHasClient(item)
  const clientKeywords = item.clientKeywordsFound ?? []

  return (
    <div
      className={cn(
        'crop-list-item',
        'crop-list-item--compact',
        'crop-list-item--pending',
        isSelected && 'crop-list-item--selected',
        isActiveNews && 'crop-list-item--active-news',
      )}
      role="button"
      tabIndex={0}
      data-active-news={isActiveNews ? 'true' : undefined}
      aria-current={isActiveNews ? 'true' : undefined}
      onClick={(e) => onSelect(e)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      aria-label={`${item.title} — precisa de corte`}
      aria-pressed={isSelected}
    >
      <div className="list-thumbnail list-thumbnail--crop list-thumbnail--pending" aria-hidden>
        <span className="list-thumbnail__pending-icon">
          <Scissors size={18} strokeWidth={1.75} />
        </span>
      </div>

      <div className="crop-list-item__body">
        <div className="crop-list-item__title-row">
          <span className="crop-list-item__title crop-list-item__title--readonly">
            {item.title}
          </span>
          <NeedsCropBadge />
          {hasClient && <ClientBadge keywords={clientKeywords} />}
        </div>
        <span className="crop-list-item__meta crop-list-item__meta--pending">
          {isSelected ? 'Desenhe na página para cortar' : `Sem corte · Página ${pageNumber}`}
        </span>
      </div>

      <div className="crop-list-item__actions">
        {onViewText && (
          <button
            type="button"
            className="crop-list-item__action-btn crop-list-item__action-btn--view"
            aria-label="Ver detalhes"
            title="Ver detalhes"
            onClick={(e) => {
              e.stopPropagation()
              onViewText()
            }}
          >
            <Eye size={14} />
          </button>
        )}

        {canDelete && onDelete && (
          <button
            type="button"
            className="crop-list-item__action-btn crop-list-item__action-btn--delete crop-list-item__action-btn--pending-delete"
            aria-label="Excluir notícia"
            title="Excluir notícia"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <Trash2 size={14} strokeWidth={2} aria-hidden />
          </button>
        )}
      </div>
    </div>
  )
}
