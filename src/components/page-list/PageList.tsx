import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, CircleDashed, Filter, LayoutGrid, Newspaper, Search, UserRound } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useSessionStore } from '@/stores/sessionStore'
import { useCropsStore } from '@/stores/cropsStore'
import { useNewsStore } from '@/stores/newsStore'
import { useFilteredPages, useCurrentPdf } from '@/hooks/useSessionSelectors'
import { buildNewsCountByPage } from '@/utils/pageListStats'
import { buildClientCountByPage, countPagesWithClientCrops } from '@/utils/cropClientStats'
import { isPageFinalizedInState } from '@/utils/pageFinalization'
import type { PageFilter } from '@/types/session'
import './page-list.css'

const FILTER_OPTIONS: {
  value: PageFilter
  label: string
  shortLabel: string
  tone: 'all' | 'withClient' | 'withoutClient'
  icon: typeof LayoutGrid
}[] = [
  { value: 'all', label: 'Todas as páginas', shortLabel: 'Todas', tone: 'all', icon: LayoutGrid },
  { value: 'withClient', label: 'Páginas com cliente', shortLabel: 'Cliente', tone: 'withClient', icon: UserRound },
  { value: 'withoutClient', label: 'Páginas sem cliente', shortLabel: 'Sem', tone: 'withoutClient', icon: CircleDashed },
]

const isMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform)

export function PageList() {
  const filteredPages = useFilteredPages()
  const selectedPageNumber = useSessionStore((s) => s.selectedPageNumber)
  const selectPage = useSessionStore((s) => s.selectPage)
  const pageFilter = useSessionStore((s) => s.pageFilter)
  const setPageFilter = useSessionStore((s) => s.setPageFilter)
  const currentPdf = useCurrentPdf()
  const crops = useCropsStore((s) => s.crops)
  const finalizedPages = useCropsStore((s) => s.finalizedPages)
  const newsItems = useNewsStore((s) => s.items)
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const newsCountByPage = useMemo(
    () => (currentPdf ? buildNewsCountByPage(newsItems, currentPdf.id) : new Map<number, number>()),
    [newsItems, currentPdf],
  )

  const clientCountByPage = useMemo(
    () => (currentPdf ? buildClientCountByPage(crops, currentPdf.id) : new Map<number, number>()),
    [crops, currentPdf],
  )

  const filterCounts = useMemo(() => {
    if (!currentPdf) return { all: 0, withClient: 0, withoutClient: 0 }
    return countPagesWithClientCrops(currentPdf.pages, crops, currentPdf.id)
  }, [currentPdf, crops])

  const visiblePages = useMemo(() => {
    const q = search.trim()
    if (!q) return filteredPages
    return filteredPages.filter((p) => String(p.pageNumber).includes(q))
  }, [filteredPages, search])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  if (!currentPdf) {
    return (
      <div className="page-list page-list--empty">
        <p>Selecione um PDF</p>
      </div>
    )
  }

  return (
    <div className="page-list">
      <div className="page-list__header">
        <h2 className="page-list__title">Páginas</h2>
      </div>

      <div className="page-list__toolbar">
        <div className="page-list__search-row">
          <label className="page-list__search">
            <Search size={15} className="page-list__search-icon" aria-hidden />
            <input
              ref={searchRef}
              type="search"
              className="page-list__search-input"
              placeholder="Buscar página..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {!search && (
              <kbd className="page-list__shortcut" aria-hidden>
                {isMac ? '⌘K' : 'Ctrl K'}
              </kbd>
            )}
          </label>
          <button type="button" className="page-list__filter-toggle" aria-label="Filtros">
            <Filter size={15} aria-hidden />
          </button>
        </div>

        <div
          className="page-list__filters"
          role="group"
          aria-label="Filtrar páginas"
        >
          {FILTER_OPTIONS.map((opt) => {
            const count = filterCounts[opt.value]
            const isActive = pageFilter === opt.value
            const Icon = opt.icon

            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={isActive}
                aria-label={`${opt.label} (${count})`}
                title={`${opt.label} (${count})`}
                className={cn(
                  'page-list__filter-btn',
                  `page-list__filter-btn--${opt.tone}`,
                  isActive && 'page-list__filter-btn--active',
                )}
                onClick={() => setPageFilter(opt.value)}
              >
                <span className="page-list__filter-main">
                  <Icon size={11} strokeWidth={2.25} aria-hidden />
                  <span className="page-list__filter-label">{opt.shortLabel}</span>
                </span>
                <span className="page-list__filter-badge">{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      <ul className="page-list__items" role="listbox" aria-label="Lista de páginas">
        {visiblePages.map((page) => {
          const isActive = selectedPageNumber === page.pageNumber
          const newsCount = newsCountByPage.get(page.pageNumber) ?? 0
          const clientCount = clientCountByPage.get(page.pageNumber) ?? 0
          const pageFinalized = currentPdf
            ? isPageFinalizedInState(finalizedPages, currentPdf.id, page.pageNumber)
            : false

          return (
            <li key={page.pageNumber} role="none">
              <button
                type="button"
                role="option"
                aria-selected={isActive}
                aria-label={
                  pageFinalized
                    ? `Página ${page.pageNumber} — finalizada`
                    : `Página ${page.pageNumber} — pendente`
                }
                className={cn('page-list__item', isActive && 'page-list__item--active')}
                onClick={() => selectPage(page.pageNumber)}
              >
                <span
                  className={cn(
                    'page-list__status',
                    pageFinalized
                      ? 'page-list__status--finalized'
                      : 'page-list__status--pending',
                  )}
                  title={pageFinalized ? 'Página finalizada' : 'Página pendente'}
                  aria-hidden
                >
                  {pageFinalized && <Check size={11} strokeWidth={2.75} />}
                </span>
                <span className="page-list__page-name">Página {page.pageNumber}</span>
                <span
                  className="page-list__meta"
                  aria-label={`${clientCount} ${clientCount === 1 ? 'cliente' : 'clientes'}, ${newsCount} ${newsCount === 1 ? 'notícia' : 'notícias'}`}
                >
                  <span
                    className={cn(
                      'page-list__indicator',
                      'page-list__indicator--client',
                      clientCount > 0 && 'page-list__indicator--has-value',
                    )}
                    title={`${clientCount} ${clientCount === 1 ? 'cliente' : 'clientes'}`}
                  >
                    <span className="page-list__indicator-icon" aria-hidden>
                      <UserRound size={11} strokeWidth={2.3} />
                    </span>
                    <span className="page-list__indicator-count">{clientCount}</span>
                  </span>
                  <span
                    className={cn(
                      'page-list__indicator',
                      'page-list__indicator--news',
                      newsCount > 0 && 'page-list__indicator--has-value',
                    )}
                    title={`${newsCount} ${newsCount === 1 ? 'notícia' : 'notícias'}`}
                  >
                    <span className="page-list__indicator-icon" aria-hidden>
                      <Newspaper size={11} strokeWidth={2.3} />
                    </span>
                    <span className="page-list__indicator-count">{newsCount}</span>
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {visiblePages.length === 0 && (
        <p className="page-list__empty">Nenhuma página encontrada</p>
      )}
    </div>
  )
}
