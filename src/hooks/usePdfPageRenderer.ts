import { useEffect, useRef, useState } from 'react'
import { loadPdfDocument, renderPageToCanvas } from '@/lib/pdf/documentCache'
import { useViewerStore } from '@/stores/viewerStore'

const FALLBACK_WIDTH = 595
const FALLBACK_HEIGHT = 842

export function usePdfPageRenderer(pdfUrl: string | undefined, pageNumber: number) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dimensions, setDimensions] = useState({ width: FALLBACK_WIDTH, height: FALLBACK_HEIGHT })
  const [error, setError] = useState<string | null>(null)
  const zoom = useViewerStore((s) => s.zoom)
  const setRendering = useViewerStore((s) => s.setRendering)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !pdfUrl) return

    let cancelled = false
    setRendering(true)
    setError(null)

    const render = async () => {
      try {
        const pdf = await loadPdfDocument(pdfUrl)
        const safePage = Math.min(pageNumber, pdf.numPages)
        const dims = await renderPageToCanvas(pdfUrl, safePage, canvas, zoom)
        if (!cancelled) {
          setDimensions(dims)
          if (safePage !== pageNumber) {
            setError(`PDF possui ${pdf.numPages} página(s). Exibindo página ${safePage}.`)
          }
        }
      } catch (err) {
        if (!cancelled) {
          setDimensions({ width: FALLBACK_WIDTH * zoom, height: FALLBACK_HEIGHT * zoom })
          setError(err instanceof Error ? err.message : 'Erro ao renderizar PDF')
          const ctx = canvas.getContext('2d')
          if (ctx) {
            canvas.width = FALLBACK_WIDTH * zoom
            canvas.height = FALLBACK_HEIGHT * zoom
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.fillStyle = '#5f6368'
            ctx.font = `${16 * zoom}px Inter, sans-serif`
            ctx.fillText(`Página ${pageNumber} (visualização simulada)`, 40 * zoom, 60 * zoom)
          }
        }
      } finally {
        if (!cancelled) setRendering(false)
      }
    }

    void render()

    return () => {
      cancelled = true
    }
  }, [pdfUrl, pageNumber, zoom, setRendering])

  return { canvasRef, dimensions, error }
}
