import { useMemo } from 'react'
import { ChevronLeft, ChevronRight, Scan } from 'lucide-react'
import { ComboBox } from '@/components/ui/ComboBox/combobox'
import { useSessionStore } from '@/stores/sessionStore'
import { useCropsStore } from '@/stores/cropsStore'
import { useNewsStore } from '@/stores/newsStore'
import { useViewerStore } from '@/stores/viewerStore'
import { useCurrentPdf } from '@/hooks/useSessionSelectors'
import type { VehicleEdition, NewsViewFilter } from '@/types/session'
import './app-header.css'

const ZOOM_PRESETS = [50, 75, 100, 125, 150, 200, 300, 400]

const NEWS_VIEW_OPTIONS: { value: NewsViewFilter; label: string }[] = [
  { value: 'all', label: 'Todas as notícias' },
  { value: 'withClient', label: 'Notícias com cliente' },
]

function formatEditionLabel(edition: VehicleEdition): string {
  const [year, month, day] = edition.editionDate.split('-')
  return `${edition.vehicleName} - ${day}/${month}/${year}`
}

export function AppHeader() {
  const editions = useSessionStore((s) => s.editions)
  const selectedEditionId = useSessionStore((s) => s.selectedEditionId)
  const selectedPageNumber = useSessionStore((s) => s.selectedPageNumber)
  const selectEdition = useSessionStore((s) => s.selectEdition)
  const newsViewFilter = useSessionStore((s) => s.newsViewFilter)
  const setNewsViewFilter = useSessionStore((s) => s.setNewsViewFilter)
  const nextPage = useSessionStore((s) => s.nextPage)
  const prevPage = useSessionStore((s) => s.prevPage)
  const hydrateFromEdition = useCropsStore((s) => s.hydrateFromEdition)
  const hydrateNewsFromEdition = useNewsStore((s) => s.hydrateFromEdition)

  const zoom = useViewerStore((s) => s.zoom)
  const setZoom = useViewerStore((s) => s.setZoom)
  const resetView = useViewerStore((s) => s.resetView)

  const currentPdf = useCurrentPdf()

  const zoomPercent = Math.round(zoom * 100)
  const zoomOptions = useMemo(() => {
    const values = new Set(ZOOM_PRESETS)
    values.add(zoomPercent)
    return [...values]
      .sort((a, b) => a - b)
      .map((value) => ({ value: String(value), label: `${value}%` }))
  }, [zoomPercent])

  const handleEditionChange = (id: string) => {
    selectEdition(id)
    const edition = editions.find((e) => e.id === id)
    if (edition) {
      hydrateFromEdition(edition)
      hydrateNewsFromEdition(edition)
    }
  }

  const isFirstPage = selectedPageNumber <= 1
  const isLastPage = currentPdf ? selectedPageNumber >= currentPdf.pages.length : true

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <span className="app-header__title"></span>
      </div>

      <div className="app-header__session">
        <ComboBox
          id="edition-select"
          label="Veículo"
          hideLabel
          searchable
          searchPlaceholder="Buscar veículo..."
          className="combobox--edition"
          value={selectedEditionId ?? ''}
          options={editions.map((e) => ({
            value: e.id,
            label: formatEditionLabel(e),
          }))}
          onChange={handleEditionChange}
        />
        <span className="app-header__session-divider" aria-hidden />
        <ComboBox
          id="news-view-select"
          label="Notícias"
          hideLabel
          className="combobox--news"
          value={newsViewFilter}
          options={NEWS_VIEW_OPTIONS}
          onChange={(value) => setNewsViewFilter(value as NewsViewFilter)}
        />
      </div>

      <div className="app-header__controls">
        {currentPdf && (
          <nav className="app-header__pagination" aria-label="Navegação de páginas">
            <button
              type="button"
              className="app-header__pagination-btn"
              onClick={prevPage}
              disabled={isFirstPage}
              aria-label="Página anterior"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="app-header__pagination-label">
              {selectedPageNumber} / {currentPdf.pages.length}
            </span>

            <button
              type="button"
              className="app-header__pagination-btn"
              onClick={nextPage}
              disabled={isLastPage}
              aria-label="Próxima página"
            >
              <ChevronRight size={16} />
            </button>
          </nav>
        )}

        <ComboBox
          id="zoom-select"
          label="Zoom"
          hideLabel
          className="combobox--zoom"
          value={String(zoomPercent)}
          options={zoomOptions}
          onChange={(value) => setZoom(Number(value) / 100)}
        />

        <button
          type="button"
          className="app-header__focus-btn"
          onClick={resetView}
          aria-label="Ajustar visualização"
          title="Ajustar visualização"
        >
          <Scan size={18} strokeWidth={1.75} />
        </button>
      </div>
    </header>
  )
}
