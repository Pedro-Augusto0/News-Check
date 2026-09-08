import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, ChevronRight, FileText, ListFilter, Search, UserRound, X } from 'lucide-react'
import { ComboBox } from '@/shared/ui/combo-box'
import { formatPublicationLabel } from '@/features/publication-api'
import type { VehicleEdition } from '@/features/edition-session'
import { cn } from '@/shared/ui/utils/cn'
import { groupBySection, UNSECTIONED_LABEL } from '../application'
import './review-page-rail.css'

type PageFilter = 'all' | 'pending' | 'clients'

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
  section: string
  itemCount: number
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

function formatEditionDateShort(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return iso
  const formatted = new Date(year, month - 1, day).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

function PageRow({
  page,
  isActive,
  onSelectPage,
}: {
  page: PageStat
  isActive: boolean
  onSelectPage: (pageNumber: string) => void
}) {
  const newsCount = page.itemCount > 0 ? page.itemCount : page.newsCount
  const statusLabel = page.reviewed ? 'revisada' : 'pendente'

  return (
    <li role="none">
      <button
        type="button"
        role="option"
        aria-selected={isActive}
        aria-label={`Página ${page.pageNumber} — ${statusLabel}, ${newsCount} notícia${newsCount === 1 ? '' : 's'}${page.clientNewsCount > 0 ? `, ${page.clientNewsCount} com cliente` : ''}`}
        className={cn(
          'review-page-rail__item',
          isActive && 'review-page-rail__item--active',
          page.reviewed && 'review-page-rail__item--reviewed',
        )}
        onClick={() => onSelectPage(page.pageNumber)}
      >
        <span
          className={cn(
            'review-page-rail__status',
            page.reviewed
              ? 'review-page-rail__status--reviewed'
              : 'review-page-rail__status--pending',
          )}
          title={page.reviewed ? 'Página revisada' : 'Página pendente'}
          aria-hidden
        >
          {page.reviewed && <Check size={12} strokeWidth={2.8} />}
        </span>
        <span className="review-page-rail__page-number">{page.pageNumber}</span>

        <span className="review-page-rail__stats">
          {newsCount > 0 && (
            <span
              className="review-page-rail__stat review-page-rail__stat--news"
              title={`${newsCount} notícia${newsCount === 1 ? '' : 's'}`}
            >
              <FileText size={11} strokeWidth={2.2} aria-hidden />
              {newsCount}
            </span>
          )}

          {page.clientNewsCount > 0 && (
            <span
              className="review-page-rail__stat review-page-rail__stat--client"
              title={`${page.clientNewsCount} notícia${page.clientNewsCount === 1 ? '' : 's'} com cliente`}
            >
              <UserRound size={11} strokeWidth={2.3} aria-hidden />
              {page.clientNewsCount}
            </span>
          )}
        </span>
      </button>
    </li>
  )
}

export function ReviewPageRail({
  pages,
  currentPageNumber,
  editions,
  selectedEditionId,
  onEditionChange,
  onSelectPage,
}: ReviewPageRailProps) {
  const [pageFilter, setPageFilter] = useState<PageFilter>('all')
  const [pageQuery, setPageQuery] = useState('')
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})

  const selectedEdition = editions.find((edition) => edition.id === selectedEditionId)
  const pagesReviewed = pages.filter((page) => page.reviewed).length
  const pagesTotal = pages.length
  const percent = pagesTotal === 0 ? 0 : Math.round((pagesReviewed / pagesTotal) * 100)
  const hasPendingPages = pages.some((page) => page.pending > 0)

  const visible = useMemo(() => {
    let next = pages
    if (pageFilter === 'pending') next = next.filter((page) => page.pending > 0)
    if (pageFilter === 'clients') next = next.filter((page) => page.clientNewsCount > 0)
    const query = pageQuery.trim().toLocaleLowerCase('pt-BR')
    if (!query) return next
    return next.filter((page) => {
      const number = String(page.pageNumber).toLocaleLowerCase('pt-BR')
      const section = page.section.toLocaleLowerCase('pt-BR')
      return number.includes(query) || section.includes(query)
    })
  }, [pages, pageFilter, pageQuery])

  const sectionGroups = useMemo(
    () => groupBySection(visible, (page) => page.section),
    [visible],
  )

  useEffect(() => {
    setCollapsedSections({})
    setPageFilter('all')
    setPageQuery('')
  }, [selectedEditionId])

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  return (
    <nav className="review-page-rail" aria-label="Páginas">
      <div className="review-page-rail__edition">
        <div className="review-page-rail__edition-head">
          <span className="review-page-rail__edition-label">Edição</span>
          <button
            type="button"
            className="review-page-rail__filter-btn"
            aria-label="Filtrar edições"
            title="Filtrar"
          >
            <ListFilter size={14} strokeWidth={2} aria-hidden />
          </button>
        </div>

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
          renderValue={() => (
            <span className="review-page-rail__edition-value">
              <span className="review-page-rail__edition-name">
                {selectedEdition?.vehicleName ?? 'Selecionar edição'}
              </span>
              {selectedEdition && (
                <span className="review-page-rail__edition-date">
                  {formatEditionDateShort(selectedEdition.editionDate)}
                </span>
              )}
            </span>
          )}
        />
      </div>

      <div className="review-page-rail__progress">
        <span className="review-page-rail__progress-caption">Páginas revisadas</span>
        <span className="review-page-rail__progress-label" aria-live="polite">
          {pagesReviewed} / {pagesTotal}
        </span>
      </div>

      <span className="review-page-rail__track" aria-hidden>
        <span className="review-page-rail__fill" style={{ width: `${percent}%` }} />
      </span>

      <div className="review-page-rail__tabs" role="tablist" aria-label="Filtrar páginas">
        <button
          type="button"
          role="tab"
          aria-selected={pageFilter === 'all'}
          className={cn(
            'review-page-rail__tab review-page-rail__tab--solo',
            pageFilter === 'all' && 'review-page-rail__tab--on',
          )}
          onClick={() => setPageFilter('all')}
        >
          Todas
        </button>

        <div className="review-page-rail__tabs-group" role="presentation">
          <button
            type="button"
            role="tab"
            aria-selected={pageFilter === 'pending'}
            className={cn(
              'review-page-rail__tab',
              pageFilter === 'pending' && 'review-page-rail__tab--on',
            )}
            onClick={() => setPageFilter('pending')}
          >
            Pendentes
            {hasPendingPages && <span className="review-page-rail__tab-dot" aria-hidden />}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={pageFilter === 'clients'}
            className={cn(
              'review-page-rail__tab',
              pageFilter === 'clients' && 'review-page-rail__tab--on',
            )}
            onClick={() => setPageFilter('clients')}
          >
            Clientes
          </button>
        </div>
      </div>

      <label className="search-field review-page-rail__search">
        <Search size={13} strokeWidth={2.2} className="search-field__icon" aria-hidden />
        <input
          type="search"
          className="search-field__input"
          placeholder="Página..."
          value={pageQuery}
          onChange={(event) => setPageQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return
            event.stopPropagation()
            if (pageQuery) setPageQuery('')
            else (event.currentTarget as HTMLInputElement).blur()
          }}
          aria-label="Buscar página por número ou seção"
        />
        {pageQuery ? (
          <button
            type="button"
            className="review-page-rail__search-clear"
            onClick={() => setPageQuery('')}
            aria-label="Limpar busca"
          >
            <X size={12} strokeWidth={2.4} />
          </button>
        ) : null}
      </label>

      <div className="review-page-rail__list" role="listbox" aria-label="Lista de páginas">
        {sectionGroups.length === 0 ? (
          <p className="review-page-rail__empty">Nenhuma página</p>
        ) : (
          sectionGroups.map((group) => {
          const showHeader =
            sectionGroups.length > 1 || group.section !== UNSECTIONED_LABEL
          const expanded = Boolean(pageQuery) || !showHeader || !collapsedSections[group.section]
          const isCurrentSection = group.items.some((page) => page.pageNumber === currentPageNumber)
          const sectionPages = (
            <ul className="review-page-rail__section-pages">
              {group.items.map((page) => (
                <PageRow
                  key={page.pageNumber}
                  page={page}
                  isActive={page.pageNumber === currentPageNumber}
                  onSelectPage={onSelectPage}
                />
              ))}
            </ul>
          )

          if (!showHeader) return <div key={group.section}>{sectionPages}</div>

          return (
            <section
              key={group.section}
              className={cn(
                'review-page-rail__section',
                isCurrentSection && 'review-page-rail__section--current',
                !expanded && 'review-page-rail__section--collapsed',
              )}
            >
              <button
                type="button"
                className="review-page-rail__section-header"
                onClick={() => toggleSection(group.section)}
                aria-expanded={expanded}
              >
                <span className="review-page-rail__section-toggle" aria-hidden>
                  {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </span>
                <span className="review-page-rail__section-title">{group.section}</span>
                <span className="review-page-rail__section-count">{group.items.length}</span>
              </button>
              {expanded && sectionPages}
            </section>
          )
        })
        )}
      </div>
    </nav>
  )
}
