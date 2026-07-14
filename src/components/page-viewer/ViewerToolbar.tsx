import { Check, Maximize2, Minus, Plus, RotateCcw } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useSessionStore } from '@/stores/sessionStore'
import { useCropsStore } from '@/stores/cropsStore'
import { useCurrentPdf } from '@/hooks/useSessionSelectors'
import { isPageFinalizedInState } from '@/utils/pageFinalization'
import { useViewerStore } from '@/stores/viewerStore'
import './viewer-toolbar.css'

export function ViewerToolbar() {
  const currentPdf = useCurrentPdf()
  const selectedEditionId = useSessionStore((s) => s.selectedEditionId)
  const selectedPageNumber = useSessionStore((s) => s.selectedPageNumber)
  const finalizedPages = useCropsStore((s) => s.finalizedPages)
  const finalizePage = useCropsStore((s) => s.finalizePage)
  const reopenPage = useCropsStore((s) => s.reopenPage)
  const zoomIn = useViewerStore((s) => s.zoomIn)
  const zoomOut = useViewerStore((s) => s.zoomOut)
  const resetView = useViewerStore((s) => s.resetView)
  const isRendering = useViewerStore((s) => s.isRendering)

  const pageFinalized =
    !!currentPdf && isPageFinalizedInState(finalizedPages, currentPdf.id, selectedPageNumber)

  const handleTogglePageFinalization = () => {
    if (!selectedEditionId || !currentPdf) return
    if (pageFinalized) {
      reopenPage(selectedEditionId, currentPdf.id, selectedPageNumber)
      return
    }
    finalizePage(selectedEditionId, currentPdf.id, selectedPageNumber)
  }

  return (
    <div className="viewer-toolbar">
      <div className="viewer-toolbar__tools">
        <button
          type="button"
          className="viewer-toolbar__tool viewer-toolbar__tool--icon"
          onClick={zoomOut}
          aria-label="Diminuir zoom"
          title="Diminuir zoom"
        >
          <Minus size={16} strokeWidth={1.75} aria-hidden />
        </button>

        <button
          type="button"
          className="viewer-toolbar__tool viewer-toolbar__tool--icon"
          onClick={zoomIn}
          aria-label="Aumentar zoom"
          title="Aumentar zoom"
        >
          <Plus size={16} strokeWidth={1.75} aria-hidden />
        </button>

        <button
          type="button"
          className="viewer-toolbar__tool viewer-toolbar__tool--icon"
          onClick={resetView}
          aria-label="Ajustar à tela"
          title="Ajustar à tela"
        >
          <Maximize2 size={16} strokeWidth={1.75} aria-hidden />
        </button>
      </div>

      <div className="viewer-toolbar__actions">
        {currentPdf && (
          <button
            type="button"
            className={cn(
              'viewer-toolbar__finalize-btn',
              pageFinalized && 'viewer-toolbar__finalize-btn--done',
            )}
            onClick={handleTogglePageFinalization}
            title={
              pageFinalized
                ? 'Reabrir página para revisão'
                : 'Finalizar página — marcar todos os cortes como revisados'
            }
          >
            {pageFinalized ? (
              <RotateCcw size={15} strokeWidth={2} aria-hidden />
            ) : (
              <Check size={15} strokeWidth={2.25} aria-hidden />
            )}
            <span>{pageFinalized ? 'Reabrir página' : 'Finalizar página'}</span>
          </button>
        )}
        {isRendering && <span className="viewer-toolbar__status">Renderizando…</span>}
      </div>
    </div>
  )
}
