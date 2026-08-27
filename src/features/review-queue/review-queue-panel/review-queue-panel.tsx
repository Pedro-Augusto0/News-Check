import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  Link2,
} from 'lucide-react'
import type { Crop as CropModel } from '@/features/crops'
import type { VehicleEdition } from '@/features/edition-session'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/ui/utils/cn'
import { groupReviewQueueByPage } from '../application'
import { type ReviewQueueItem, type ReviewStatus } from '../model'
import { ReviewQueueListItem } from './review-queue-list-item'
import './review-queue-panel.css'

interface ReviewQueuePanelProps {
  items: ReviewQueueItem[]
  currentId: string | null
  inspectItem: ReviewQueueItem | null
  viewPageNumber: string | null
  canAttach: boolean
  statuses: Record<string, ReviewStatus>
  crops: Record<string, CropModel>
  edition: VehicleEdition | undefined
  onSelect: (id: string) => void
  onDiscard: (id: string) => void
  onViewDetails: (item: ReviewQueueItem) => void
  onInspect: (id: string) => void
  onAttach: () => void
  onClearInspect: () => void
  onSelectPage?: (pageNumber: string) => void
  selectionLocked?: boolean
  activeCropId?: string | null
  onUngroupCrop?: (cropId: string) => void
  onEditCrop?: (cropId: string) => void
}

function isDoneStatus(status: ReviewStatus | undefined): boolean {
  return status === 'approved' || status === 'rejected'
}

function countNoCrop(items: ReviewQueueItem[]): number {
  return items.filter(
    (item) => item.suspectReasons.includes('no-crop') || item.cropIds.length === 0,
  ).length
}

export function ReviewQueuePanel({
  items,
  currentId,
  inspectItem,
  viewPageNumber,
  canAttach,
  statuses,
  crops,
  edition,
  onSelect,
  onDiscard,
  onViewDetails,
  onInspect,
  onAttach,
  onClearInspect,
  onSelectPage,
  selectionLocked = false,
  activeCropId = null,
  onUngroupCrop,
  onEditCrop,
}: ReviewQueuePanelProps) {
  const inspectId = inspectItem?.id ?? null
  const currentNewsPage = items.find((item) => item.id === currentId)?.pageNumber
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null)
  const [collapsedPages, setCollapsedPages] = useState<Record<string, boolean>>({})
  const menuRef = useRef<HTMLDivElement>(null)
  const pageGroups = useMemo(() => groupReviewQueueByPage(items), [items])

  const isPageExpanded = useCallback(
    (pageNumber: string) => {
      if (pageNumber in collapsedPages) return !collapsedPages[pageNumber]
      return pageNumber === viewPageNumber || pageNumber === currentNewsPage
    },
    [collapsedPages, viewPageNumber, currentNewsPage],
  )

  const togglePage = useCallback(
    (pageNumber: string) => {
      setCollapsedPages((prev) => {
        const currentlyExpanded =
          pageNumber in prev
            ? !prev[pageNumber]
            : pageNumber === viewPageNumber || pageNumber === currentNewsPage
        return { ...prev, [pageNumber]: currentlyExpanded }
      })
    },
    [viewPageNumber, currentNewsPage],
  )

  useEffect(() => {
    setCollapsedPages({})
  }, [viewPageNumber, edition?.id])

  useEffect(() => {
    if (!menu) return
    const close = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return
      setMenu(null)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(null)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [menu])

  return (
    <div className="review-queue-panel">
      {inspectItem && (
        <section className="review-queue-panel__card review-queue-panel__card--inspect">
          <div className="review-queue-panel__current-top">
            <p className="review-queue-panel__kicker">Visualizando</p>
            <span className="review-queue-panel__inspect-page">Pág. {inspectItem.pageNumber}</span>
          </div>
          <h2 className="review-queue-panel__title">{inspectItem.title}</h2>
          <p className="review-queue-panel__inspect-copy">
            Ajuste o recorte ou desenhe outro nesta notícia; depois junte à notícia ativa.
          </p>
          <div className="review-queue-panel__inspect-actions">
            <Button
              variant="primary"
              className="review-queue-panel__attach-btn"
              onClick={onAttach}
              disabled={!canAttach}
              title="Juntar esta notícia à notícia atual (A)"
            >
              <Link2 size={14} strokeWidth={2.2} />
              Juntar a esta notícia
              <kbd>A</kbd>
            </Button>
            <Button
              variant="secondary"
              className="review-queue-panel__stop-inspect-btn"
              onClick={onClearInspect}
              title="Parar de visualizar (Esc)"
            >
              <EyeOff size={14} strokeWidth={2} />
              Parar de visualizar
              <kbd>Esc</kbd>
            </Button>
          </div>
        </section>
      )}

      <div className="review-queue-panel__card review-queue-panel__card--list">
        <p className="review-queue-panel__kicker review-queue-panel__kicker--list">Notícias</p>
        <div className="review-queue-panel__list">
          {pageGroups.length === 0 && (
            <p className="review-queue-panel__empty">Nenhuma notícia nesta edição</p>
          )}

          {pageGroups.map((section) => {
            const expanded = isPageExpanded(section.pageNumber)
            const isViewedPage = section.pageNumber === viewPageNumber
            const hasActiveNews = section.items.some(
              (item) => item.id === currentId || item.id === inspectId,
            )
            const noCropCount = countNoCrop(section.items)

            return (
              <section
                key={section.pageNumber}
                className={cn(
                  'review-queue-panel__page',
                  isViewedPage && 'review-queue-panel__page--current',
                  hasActiveNews && 'review-queue-panel__page--active',
                  !expanded && 'review-queue-panel__page--collapsed',
                )}
              >
                <button
                  type="button"
                  className="review-queue-panel__page-header"
                  onClick={() => {
                    togglePage(section.pageNumber)
                    onSelectPage?.(section.pageNumber)
                  }}
                  aria-expanded={expanded}
                >
                  <span className="review-queue-panel__page-toggle" aria-hidden>
                    {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  </span>
                  <span className="review-queue-panel__page-title">
                    Página {section.pageNumber}
                    {hasActiveNews && <span className="review-queue-panel__page-dot" aria-hidden />}
                  </span>
                  <span className="review-queue-panel__page-badges">
                    <span className="review-queue-panel__page-badge review-queue-panel__page-badge--news">
                      {section.items.length} {section.items.length === 1 ? 'notícia' : 'notícias'}
                    </span>
                    {noCropCount > 0 && (
                      <span className="review-queue-panel__page-badge review-queue-panel__page-badge--pending">
                        {noCropCount} sem corte
                      </span>
                    )}
                  </span>
                </button>

                {expanded && (
                  <div className="review-queue-panel__page-items">
                    {section.items.map((item, itemIndex) => (
                      <ReviewQueueListItem
                        key={item.id}
                        item={item}
                        index={itemIndex + 1}
                        crops={crops}
                        edition={edition}
                        isCurrent={item.id === currentId}
                        isInspect={item.id === inspectId}
                        isDone={isDoneStatus(statuses[item.id])}
                        selectionLocked={selectionLocked}
                        activeCropId={activeCropId}
                        onSelect={() => onSelect(item.id)}
                        onDiscard={() => onDiscard(item.id)}
                        onUngroupCrop={onUngroupCrop}
                        onEditCrop={onEditCrop}
                        onContextMenu={(event) => {
                          if (item.id === currentId) return
                          event.preventDefault()
                          setMenu({ id: item.id, x: event.clientX, y: event.clientY })
                        }}
                      />
                    ))}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      </div>

      {menu &&
        createPortal(
          <div
            ref={menuRef}
            className="review-queue-panel__menu"
            role="menu"
            style={{
              top: Math.min(menu.y, window.innerHeight - 56),
              left: Math.min(menu.x, window.innerWidth - 200),
            }}
          >
            <button
              type="button"
              role="menuitem"
              className="review-queue-panel__menu-item"
              onClick={() => {
                const item = items.find((entry) => entry.id === menu.id)
                if (item) onViewDetails(item)
                setMenu(null)
              }}
            >
              <FileText size={13} strokeWidth={2} />
              Ver notícia
            </button>
            <button
              type="button"
              role="menuitem"
              className="review-queue-panel__menu-item"
              onClick={() => {
                onInspect(menu.id)
                setMenu(null)
              }}
            >
              <Eye size={13} strokeWidth={2} />
              Visualizar notícia
            </button>
          </div>,
          document.body,
        )}
    </div>
  )
}
