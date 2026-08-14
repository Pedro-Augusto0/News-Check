import { useEffect, useRef, useState } from 'react'
import { loadPageImage, renderImageToCanvas } from '@/lib/image/pageImageCache'
import { DEFAULT_FIT_SCALE, useViewerStore } from '@/stores/viewerStore'

const FALLBACK_WIDTH = 595
const FALLBACK_HEIGHT = 842

/** Espaço mínimo lateral para não colar a imagem nas bordas do scroll. */
const VIEWPORT_GUTTER = 8

/**
 * Renderiza a página-imagem com zoom relativo ao encaixe padrão no viewer.
 * zoom = 1 → 100% (75% da largura útil, tamanho confortável de trabalho).
 */
export function usePageImageRenderer(
  imageUrl: string | undefined,
  viewportWidth: number,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dimensions, setDimensions] = useState({ width: FALLBACK_WIDTH, height: FALLBACK_HEIGHT })
  const [error, setError] = useState<string | null>(null)
  const zoom = useViewerStore((s) => s.zoom)
  const setRendering = useViewerStore((s) => s.setRendering)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let cancelled = false
    setRendering(true)
    setError(null)

    const usableWidth = Math.max(220, viewportWidth - VIEWPORT_GUTTER)

    const paintFallback = (message: string) => {
      const width = Math.round(Math.min(FALLBACK_WIDTH, usableWidth) * DEFAULT_FIT_SCALE * zoom)
      const height = Math.round((FALLBACK_HEIGHT / FALLBACK_WIDTH) * width)
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
        ctx.fillStyle = '#5f6368'
        ctx.font = `14px Inter, sans-serif`
        ctx.fillText(message, 24, 40)
      }
      setDimensions({ width, height })
    }

    const render = async () => {
      if (!imageUrl) {
        if (!cancelled) {
          paintFallback('Imagem da página indisponível')
          setRendering(false)
        }
        return
      }

      try {
        const image = await loadPageImage(imageUrl)
        if (cancelled) return

        const fitScale = usableWidth / image.naturalWidth
        const scale = Math.max(0.05, fitScale * DEFAULT_FIT_SCALE * zoom)
        const dims = await renderImageToCanvas(imageUrl, canvas, scale)
        if (!cancelled) setDimensions(dims)
      } catch (err) {
        if (!cancelled) {
          paintFallback('Falha ao carregar imagem')
          setError(err instanceof Error ? err.message : 'Erro ao carregar imagem da página')
        }
      } finally {
        if (!cancelled) setRendering(false)
      }
    }

    void render()

    return () => {
      cancelled = true
    }
  }, [imageUrl, zoom, viewportWidth, setRendering])

  return { canvasRef, dimensions, error }
}
