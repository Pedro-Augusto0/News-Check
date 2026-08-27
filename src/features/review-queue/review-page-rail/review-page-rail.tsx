import { useState } from 'react'
import { Check, FileText, ListFilter, UserRound } from 'lucide-react'
import { ComboBox } from '@/shared/ui/combo-box'
import { formatPublicationLabel } from '@/features/publication-api'
import type { VehicleEdition } from '@/features/edition-session'
import { cn } from '@/shared/ui/utils/cn'
import './review-page-rail.css'

interface PageStat {
  pageNumber: string
  total: number
  pending: number
  newsCount: number
  clientCount: number
  clientNewsCount: number
  hasClient: boolean
  hasSuspect: boolean
  reviewed: boolean
}

interface ReviewPageRailProps {
  pages: PageStat[]
  currentPageNumber: string
  done: number
  total: number
  lastUpdated?: string
  editions: VehicleEdition[]
  selectedEditionId: string | null
  onEditionChange: (id: string) => void
  onSelectPage: (pageNumber: string) => void
}

export function ReviewPageRail({
  pages,
  currentPageNumber,
  done,
  total,
  editions,
  selectedEditionId,
  onEditionChange,
  onSelectPage,
}: ReviewPageRailProps) {
  const [pendingOnly, setPendingOnly] = useState(false)
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)
  const visible = pendingOnly ? pages.filter((page) => page.pending > 0) : pages

  return (
    <nav className="review-page-rail" aria-label="Páginas">
      <div className="review-page-rail__edition">
        <span className="review-page-rail__edition-label">Edição</span>
        <ComboBox
          id="review-edition-select"
          label="Veículo"
          hideLabel
          searchable
          menuPortal
          searchPlaceholder="Buscar veículo..."
          className="combobox--edition combobox--rail"
          value={selectedEditionId ?? ''}
          options={editions.map((edition) => ({
            value: edition.id,
            label: formatPublicationLabel(edition.vehicleName, edition.editionDate),
          }))}
          onChange={onEditionChange}
        />
      </div>

      <div className="review-page-rail__head">
        <span className="review-page-rail__label">Páginas</span>
        <div className="review-page-rail__head-meta">
          <span className="review-page-rail__progress-label" aria-live="polite">
            {done}/{total}
          </span>
          <button
            type="button"
            className={cn('review-page-rail__filter', pendingOnly && 'review-page-rail__filter--on')}
            onClick={() => setPendingOnly((value) => !value)}
            aria-pressed={pendingOnly}
            title={pendingOnly ? 'Mostrar todas as páginas' : 'Mostrar só páginas pendentes'}
          >
            <ListFilter size={13} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      <div className="review-page-rail__legend" aria-hidden>
        <span className="review-page-rail__legend-item">
          <FileText size={11} strokeWidth={2.2} />
          Notícias
        </span>
        <span className="review-page-rail__legend-item">
          <UserRound size={11} strokeWidth={2.2} />
          Clientes
        </span>
      </div>

      <span className="review-page-rail__track" aria-hidden>
        <span className="review-page-rail__fill" style={{ width: `${percent}%` }} />
      </span>

      <ul className="review-page-rail__list" role="listbox" aria-label="Lista de páginas">
        {visible.map((page) => {
          const isActive = page.pageNumber === currentPageNumber
          const newsCount = page.reviewed ? 0 : page.pending

          return (
            <li key={page.pageNumber} role="none">
              <button
                type="button"
                role="option"
                aria-selected={isActive}
                aria-label={
                  page.reviewed
                    ? `Página ${page.pageNumber} — revisada${page.clientNewsCount > 0 ? `, ${page.clientNewsCount} com cliente` : ''}`
                    : `Página ${page.pageNumber} — ${page.pending} notícia${page.pending === 1 ? '' : 's'} ${page.pending === 1 ? 'pendente' : 'pendentes'}${page.clientNewsCount > 0 ? `, ${page.clientNewsCount} com cliente` : ''}`
                }
                className={cn(
                  'review-page-rail__item',
                  isActive && 'review-page-rail__item--active',
                  page.reviewed && 'review-page-rail__item--reviewed',
                  page.hasClient && 'review-page-rail__item--has-client',
                )}
                onClick={() => onSelectPage(page.pageNumber)}
              >
                <span className="review-page-rail__page-number">{page.pageNumber}</span>

                <span className="review-page-rail__stats">
                  {page.reviewed ? (
                    <span className="review-page-rail__stat review-page-rail__stat--done" title="Revisada">
                      <Check size={10} strokeWidth={2.8} aria-hidden />
                    </span>
                  ) : newsCount > 0 ? (
                    <span
                      className="review-page-rail__stat review-page-rail__stat--news"
                      title={`${newsCount} notícia${newsCount === 1 ? '' : 's'} pendente${newsCount === 1 ? '' : 's'}`}
                    >
                      <FileText size={10} strokeWidth={2.2} aria-hidden />
                      {newsCount}
                    </span>
                  ) : null}

                  {page.clientNewsCount > 0 && (
                    <span
                      className="review-page-rail__stat review-page-rail__stat--client"
                      title={`${page.clientNewsCount} notícia${page.clientNewsCount === 1 ? '' : 's'} com cliente`}
                    >
                      <UserRound size={10} strokeWidth={2.3} aria-hidden />
                      {page.clientNewsCount}
                    </span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
